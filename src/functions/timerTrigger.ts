import { app, InvocationContext, Timer } from "@azure/functions";
import { DefaultAzureCredential } from "@azure/identity";
import NotionClient from "../libs/notionClient";
import AzureBoardsClient from "../libs/azureBoardsClient";

// 5分ごとに実行する
app.timer("timerTrigger", {
  schedule: "*/5 * * * *",
  handler: timerTrigger,
});

const azureDevopsScope = "499b84ac-1321-427f-aa17-267ca6975798/.default";
const managedIdentityClientId = process.env["MANAGED_IDENTITY_CLIENT_ID"];
const credential = new DefaultAzureCredential({
  managedIdentityClientId,
});

export async function timerTrigger(
  myTimer: Timer,
  c: InvocationContext,
): Promise<void> {
  c.log("Timer function processed request.");
  try {
    const azureBoardsClient = new AzureBoardsClient({
      organization: process.env["AZURE_BOARDS_ORGANIZATION"],
      project: process.env["AZURE_BOARDS_PROJECT"],
      assignedTo: process.env["AZURE_BOARDS_ASSIGNED_TO"],
    });
    const notionClient = new NotionClient(process.env["NOTION_SECRET"]!);

    const { token } = await credential.getToken(azureDevopsScope);

    // Notion のデータベースからアイテムを取得
    const pages = await notionClient.getDatabaseItems(
      process.env["NOTION_DATABASE_ID"],
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
    c.error(error);
    return;
  }
  return;
}
