export interface BoardsUpdateWebhookRequestBody {
  subscriptionId: string;
  notificationId: number;
  id: string;
  eventType: string;
  publisherId: string;
  message: Message;
  detailedMessage: Message;
  resource: Resource;
  resourceVersion: string;
  resourceContainers: ResourceContainers;
  createdDate: string;
}

interface Message {
  text: string;
  html: string;
  markdown: string;
}

interface Resource {
  id: number;
  workItemId: number;
  rev: number;
  revisedBy: RevisedBy;
  revisedDate: string;
  fields: {
    ["System.Title"]?: {
      oldValue: string;
      newValue: string;
    };
  };
  _links: Links;
  url: string;
  revision: Revision;
}

interface RevisedBy {
  displayName: string;
  name: string;
}

interface Links {
  self: {
    href: string;
  };
  parent: {
    href: string;
  };
  workItemUpdates: {
    href: string;
  };
}

interface Revision {
  id: number;
  rev: number;
  fields: {
    ["Custom.notion_page_id"]: string;
    [key: string]: string | number;
  };
}

interface ResourceContainers {
  collection: {
    id: string;
  };
  account: {
    id: string;
  };
  project: {
    id: string;
  };
}

export interface BoardsCreatedWebhookRequestBody {
  subscriptionId: string;
  notificationId: number;
  id: string;
  eventType: string;
  publisherId: string;
  message: Message;
  detailedMessage: Message;
  resource: {
    id: number;
    rev: number;
    fields: {
      ["System.Title"]: string;
      ["System.Status"]: "New" | "Approved" | "Committed" | "Done" | "Removed";
      ["System.ChangedBy"]: string;
      ["System.CreatedBy"]: string;
    };
  };
  resourceVersion: string;
  resourceContainers: ResourceContainers;
  createdDate: string;
}

export interface BoardsDeletedWebhookRequestBody {
  subscriptionId: string;
  notificationId: number;
  id: string;
  eventType: string;
  publisherId: string;
  message: Message;
  detailedMessage: Message;
  resource: {
    id: number;
    rev: number;
    fields: {
      ["System.Title"]: string;
      ["System.Status"]: "New" | "Approved" | "Committed" | "Done" | "Removed";
      ["System.ChangedBy"]: string;
      ["System.CreatedBy"]: string;
      ["Custom.notion_page_id"]?: string;
    };
  };
  resourceVersion: string;
  resourceContainers: ResourceContainers;
  createdDate: string;
}
