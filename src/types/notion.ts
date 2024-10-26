export type NotionResponse = {
  object: "list";
  results: Page[];
};

export type Page = {
  object: "page";
  id: string;
  created_time: string;
  last_edited_time: string;
  created_by: User;
  last_edited_by: User;
  cover: string | null;
  icon: string | null;
  parent: Parent;
  archived: boolean;
  in_trash: boolean;
  properties: Properties;
  url: string;
  public_url: string | null;
};

type User = {
  object: "user";
  id: string;
};

type Parent = {
  type: "database_id";
  database_id: string;
};

type Properties = {
  名前: TitleProperty;
  タグ: MultiSelectProperty;
  "Azure Board Item Id": NumberProperty;
};

type NumberProperty = {
  id: string;
  type: "number";
  number: number | null;
};

type MultiSelectProperty = {
  id: string;
  type: "multi_select";
  multi_select: MultiSelect[];
};

type MultiSelect = {
  id: string;
  name: string;
  color: string;
};

export type TitleProperty = {
  id: string;
  type: "title";
  title: TextValue[];
};

type TextValue = {
  type: "text";
  text: {
    content: string;
    link: null;
  };
};
