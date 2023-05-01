import { GoogleSpreadsheet, GoogleSpreadsheetRow, GoogleSpreadsheetWorksheet, ServiceAccountCredentials } from "google-spreadsheet";
import { KeyElement, Trie } from "./trie";

export type KvCellItem = {
  key: string;
  value: string;
}

export type KvEntry = {
  data: any;
  row: (GoogleSpreadsheetRow & KvCellItem);
}

export type KvConfig = {
  spreadsheetId: string;
  sheetId: string | undefined;
  credentials: ServiceAccountCredentials;
}

const KVS_HEADER_VALUES = ["key", "value"];

export default async function createKvs(config: KvConfig): Promise<Kvs> {
  const kvs = new Kvs(config);
  await kvs.init();

  return kvs;
}

export class Kvs {
  trie: Trie<KvEntry>;
  config: KvConfig;
  service: GoogleSpreadsheet;

  private sheet: GoogleSpreadsheetWorksheet;

  constructor(config: KvConfig) {
    this.config = config;
    this.trie = new Trie();
    this.service = new GoogleSpreadsheet(this.config.spreadsheetId);
    this.sheet = null!;
  }

  async init(): Promise<void> {
    await this.service.useServiceAccountAuth(this.config.credentials);
    await this.service.loadInfo();

    const sheetId = this.config.sheetId;
    if (sheetId != null) {
      if (sheetId in this.service.sheetsById) {
        this.sheet = this.service.sheetsById[sheetId];
      } else {
        throw new Error("SHEET NOT FOUND");
      }
    } else {
      this.sheet = this.service.sheetsByIndex[0];
    }

    const isValidHeader = validateHeader(this.sheet.headerValues);
    if (!isValidHeader) {
      await this.sheet.setHeaderRow(KVS_HEADER_VALUES);
    }

    const initialRows = await this.sheet.getRows() as (GoogleSpreadsheetRow & KvCellItem)[];
    initialRows.forEach((row) => {
      const { key, value } = row;
      const decodedKey = JSON.parse(key) as KeyElement[];
      const data = JSON.parse(value);

      this.trie.set(decodedKey, { data, row });
    });
  }

  get(key: KeyElement[]): unknown | null {
    const entry = this.trie.get(key);
    if (entry == null) {
      return null;
    }
    return entry.data;
  }

  getRange(key: KeyElement[]): unknown[] {
    const entries = this.trie.getRange(key);
    return entries.map(({ data }) => data);
  }

  async put(key: KeyElement[], value: unknown): Promise<void> {
    const keyString = JSON.stringify(key);
    const dataString = JSON.stringify(value);
    let entry = this.trie.get(key);
    if (entry == null) {
      entry = {
        data: value,
        row: await this.sheet.addRow([keyString, dataString]) as (GoogleSpreadsheetRow & KvCellItem),
      };
      this.trie.set(key, entry);
    } else {
      entry.data = value;
      entry.row.value = dataString;
      await entry.row.save();
    }
  }

  async delete(key: KeyElement[]): Promise<void> {
    const entry = this.trie.get(key);
    if (entry == null) {
      return;
    }

    await entry.row.delete();
    this.trie.delete(key);
  }
}

function validateHeader(headerValues: string[]) {
  return (
    headerValues != null &&
    headerValues.length === KVS_HEADER_VALUES.length &&
    headerValues[0] === KVS_HEADER_VALUES[0] &&
    headerValues[1] === KVS_HEADER_VALUES[1]
  );
}