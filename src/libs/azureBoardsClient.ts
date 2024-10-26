interface AzureBoardsClientConfig {
  organization: string;
  project: string;
  assignedTo: string;
}

interface Operation {
  op: string;
  path: string;
  value: any;
}

interface WorkItemResponse {
  id: number;
  rev: number;
  fields: {
    "System.Title": string;
    "System.Description": string;
  };
  _links: {
    html: {
      href: string;
    };
  };
}

class AzureBoardsClient {
  private baseUrl: string;
  private assignedTo: string;

  constructor(config: AzureBoardsClientConfig) {
    this.baseUrl = `https://dev.azure.com/${config.organization}/${config.project}/_apis/`;
    this.assignedTo = config.assignedTo;
  }

  async getWorkItems(token: string, ids: number[]): Promise<any> {
    const idsString = ids.join(",");
    const response = await fetch(
      `${this.baseUrl}wit/workitems?ids=${idsString}&api-version=6.0`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.json();
  }

  async createWorkItem(
    token: string,
    type: "Product Backlog Item",
    fields: Operation[],
  ): Promise<WorkItemResponse> {
    console.log("createWorkItem", fields, token);
    try {
      const response = await fetch(
        `${this.baseUrl}wit/workitems/$${type}?api-version=6.0`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json-patch+json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(fields),
        },
      );
      console.log("response", response);
      if (!response.ok) {
        throw new Error(`Error creating work item: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error("Failed to create work item:", error);
      throw error;
    }
  }

  async createProductBacklogItem(
    token: string,
    title: string,
    notionPageId: string,
  ) {
    return this.createWorkItem(token, "Product Backlog Item", [
      {
        op: "add",
        path: "/fields/System.Title",
        value: title || "Empty title",
      },
      {
        op: "add",
        path: "/fields/System.AssignedTo",
        value: this.assignedTo,
      },
      {
        op: "add",
        path: "/fields/Custom.notion_page_id",
        value: notionPageId,
      },
    ]);
  }

  async updateWorkItem(
    token: string,
    id: number,
    fields: any,
  ): Promise<WorkItemResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}wit/workitems/${id}?api-version=7.0`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json-patch+json",
          },
          body: JSON.stringify(fields),
        },
      );
      if (!response.ok) {
        if (response.status === 404) {
          return response.json();
        }
        throw new Error(`Error updating work item: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error("Failed to update work item:", error);
      throw error;
    }
  }

  async syncProductBacklogItem(
    token: string,
    id: number,
    title: string,
    notionPageId: string,
  ) {
    return this.updateWorkItem(token, id, [
      {
        op: "replace",
        path: "/fields/System.Title",
        value: title || "No title",
      },
      {
        op: "replace",
        path: "/fields/Custom.notion_page_id",
        value: notionPageId,
      },
    ]);
  }
}

export default AzureBoardsClient;
