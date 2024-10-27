import { NotionResponse, TitleProperty, Page } from "../types/notion";

class NotionClient {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  async getDatabaseItems(databaseId: string) {
    const url = `https://api.notion.com/v1/databases/${databaseId}/query`;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({}),
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(
          `Error fetching database items: ${response.statusText}`,
        );
      }
      const data = (await response.json()) as NotionResponse;
      return data.results;
    } catch (error) {
      console.error("Error fetching database items:", error);
      throw error;
    }
  }

  async createDatabaseItem(
    databaseId: string,
    title: string,
    azureBoardItemId: number,
  ): Promise<Page> {
    const url = "https://api.notion.com/v1/pages";
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          名前: {
            type: "title",
            title: [{ text: { content: title } }],
          },
          "Azure Board Item Id": {
            type: "number",
            number: azureBoardItemId,
          },
        },
      }),
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Error creating database item: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating database item:", error);
      throw error;
    }
  }

  async updateDatabaseItemWithAzureBoardItemId(
    notionItemId: string,
    azureBoardItemId: number,
    newTitle?: string,
  ) {
    const url = `https://api.notion.com/v1/pages/${notionItemId}`;
    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          "Azure Board Item Id": {
            type: "number",
            number: azureBoardItemId,
          },
          名前:
            newTitle &&
            ({
              type: "title",
              title: [{ text: { content: newTitle } }],
            } as TitleProperty),
        },
      }),
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 404) {
          return {
            data: null,
            status: response.status,
          };
        }
        throw new Error(`Error updating database item: ${response.statusText}`);
      }
      const data = await response.json();
      return { data, status: response.status };
    } catch (error) {
      console.error("Error updating database item:", error);
      throw error;
    }
  }

  async deleteDatabaseItem(notionItemId: string) {
    const url = `https://api.notion.com/v1/pages/${notionItemId}`;
    const options = {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${this.secret}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
    };

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Error deleting database item: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error("Error deleting database item:", error);
      throw error;
    }
  }

  getTitlePropertyText(titlePropertyValue: TitleProperty): string {
    return titlePropertyValue.title.map((t) => t.text.content).join("");
  }
}

export default NotionClient;
