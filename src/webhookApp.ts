import { DefaultAzureCredential } from "@azure/identity";
import { Context, Hono } from "hono";
import { env } from "hono/adapter";
import AzureBoardsClient from "./libs/azureBoardsClient";
import NotionClient from "./libs/notionClient";
import {
  BoardsCreatedWebhookRequestBody,
  BoardsDeletedWebhookRequestBody,
  BoardsUpdateWebhookRequestBody,
} from "./types/boards";

const app = new Hono<{
  Variables: Variables & Env;
}>();

type Env = {
  AZURE_BOARDS_PAT: string;
  AZURE_BOARDS_ORGANIZATION: string;
  AZURE_BOARDS_PROJECT: string;
  AZURE_BOARDS_ASSIGNED_TO: string;
  NOTION_SECRET: string;
  NOTION_DATABASE_ID: string;
};

type Variables = {
  azureBoardsClient: AzureBoardsClient;
  notionClient: NotionClient;
} & Env;

type ContextType = Context<{ Variables: Variables & Env }, "*", {}>;

const azureDevopsScope = "499b84ac-1321-427f-aa17-267ca6975798/.default";
const botUserName = "id-notion-boards <b0434342-f91d-48f2-b83a-9de247dd222f>";

const managedIdentityClientId = process.env["MANAGED_IDENTITY_CLIENT_ID"];
const credential = new DefaultAzureCredential({
  managedIdentityClientId,
});

app.use("*", async (c, next) => {
  const {
    AZURE_BOARDS_ASSIGNED_TO,
    AZURE_BOARDS_ORGANIZATION,
    AZURE_BOARDS_PROJECT,
    NOTION_SECRET,
  } = env<Env, ContextType>(c);
  const azureBoardsClient = new AzureBoardsClient({
    organization: AZURE_BOARDS_ORGANIZATION,
    project: AZURE_BOARDS_PROJECT,
    assignedTo: AZURE_BOARDS_ASSIGNED_TO,
  });
  c.set("azureBoardsClient", azureBoardsClient);

  const notionClient = new NotionClient(NOTION_SECRET);
  c.set("notionClient", notionClient);

  return next();
});

/**
 * Notion から Azure Boards への同期処理
 * 1. Azure Boards のアイテム ID が設定されている場合は、アイテムを更新
 * 2. Azure Boards のアイテム ID が設定されていない場合は、アイテムを作成
 */
app.get("/notion-to-boards", async (c) => {
  try {
    const azureBoardsClient = c.get("azureBoardsClient");
    const notionClient = c.get("notionClient");

    const { token } = await credential.getToken(azureDevopsScope);

    // Notion のデータベースからアイテムを取得
    const pages = await notionClient.getDatabaseItems(
      env<Env, ContextType>(c).NOTION_DATABASE_ID,
    );

    for (const page of pages) {
      const title = notionClient.getTitlePropertyText(page.properties["名前"]);
      const azureBoardItemId = page.properties["Azure Board Item Id"].number;

      // Azure Boards のアイテム ID が設定されている場合は、アイテムを更新
      if (azureBoardItemId != null) {
        await azureBoardsClient.syncProductBacklogItem(
          token,
          azureBoardItemId,
          title,
          page.id,
        );
        continue;
      }

      // Azure Boards のアイテム ID が設定されていない場合は、アイテムを作成
      const { id: createdItemId } =
        await azureBoardsClient.createProductBacklogItem(token, title, page.id);

      // Notion のアイテムに Azure Boards のアイテム ID を設定
      await notionClient.updateDatabaseItemWithAzureBoardItemId(
        page.id,
        createdItemId,
      );
    }
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return c.json({ message: error.message });
    }
    return c.json({ message: "Error." });
  }

  return c.json({ message: "Completed." });
});

/**
 * Azure Boards の更新通知(Webhook)を受け取るエンドポイント
 */
app.post("/boards-webhook-updated", async (c) => {
  const notionClient = c.get("notionClient");

  const body = await c.req.json<BoardsUpdateWebhookRequestBody>();
  const itemId = body.resource.workItemId;
  const revisedBy = body.resource.revisedBy;
  const notionPageId = body.resource.revision.fields["Custom.notion_page_id"];

  // ボットによる更新はNotionに反映しない
  if (revisedBy.name === botUserName) {
    console.log("ボットによる更新");
    return c.json({ message: "Completed." });
  }

  // ボット以外の更新はNotionに反映
  console.log("ボット以外の更新");

  const title = body.resource.fields["System.Title"]?.newValue;

  // タイトルが変わっていなければ無視
  if (title == null) {
    console.log("タイトルが変わっていない");
    return c.json({ message: "Completed." });
  }

  const { data, status } =
    await notionClient.updateDatabaseItemWithAzureBoardItemId(
      notionPageId,
      itemId,
      title,
    );

  if (status === 404) {
    // Notion の更新対象アイテムが無ければ、Azure Boards のアイテムを削除
    const azureBoardsClient = c.get("azureBoardsClient");
    const { token } = await credential.getToken(azureDevopsScope);
    const deleted = await azureBoardsClient.deleteWorkItem(token, itemId);
    return c.json({ deleted });
  }

  return c.json(data);
});

app.post("/boards-created-webhook", async (c) => {
  const notionClient = c.get("notionClient");
  const azureBoardsClient = c.get("azureBoardsClient");

  const body = await c.req.json<BoardsCreatedWebhookRequestBody>();
  const createdBy = body.resource.fields["System.CreatedBy"];
  const title = body.resource.fields["System.Title"];
  const itemId = body.resource.id;

  // ボットによるアイテム作成はNotionに反映しない
  if (createdBy === botUserName) {
    return c.json({ message: "Completed." });
  }

  // Notionにアイテムを作成
  const created = await notionClient.createDatabaseItem(
    env<Env, ContextType>(c).NOTION_DATABASE_ID,
    title,
    itemId,
  );
  const createdNotionPageId = created.id;

  const { token } = await credential.getToken(azureDevopsScope);

  // 作成したNotionアイテムのIDをAzure Boardsに設定
  await azureBoardsClient.syncProductBacklogItem(
    token,
    itemId,
    title,
    createdNotionPageId,
  );

  return c.json({ created });
});

app.post("/boards-deleted-webhook", async (c) => {
  const body = await c.req.json<BoardsDeletedWebhookRequestBody>();
  const notionPageId = body.resource.fields["Custom.notion_page_id"];

  if (notionPageId == null) {
    return c.json({ message: "Not found Notion page id." });
  }

  // Notionのアイテムを削除
  const notionClient = c.get("notionClient");
  const deleted = await notionClient.deleteDatabaseItem(notionPageId);
  return c.json(deleted);
});

export default app;
