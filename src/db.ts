import { Database } from "sqlite3";
import util from "node:util";

interface channelRow {
  channelId: string;
}
interface countRow {
  cnt: number;
}

export default class channelDb {
  database: Database;

  constructor() {
    this.database = new Database("channel.db");
    this.createTable();
  }
  async createTable() {
    await util.promisify(this.database.run).call(
      this.database,
      `\
create table if not exists channel(
    channelId text,
    primary key(channelId)
)`,
    );
  }
  async insert(channelId: string) {
    const insertStatement = this.database.prepare(
      "insert into channel(channelId) values(?)",
    );
    await util
      .promisify(insertStatement.run.bind(insertStatement, [channelId]))
      .call(insertStatement);

    insertStatement.finalize();
  }
  async delete(channelId: string) {
    const deleteStatement = this.database.prepare(
      "delete from channel where channelId = ?",
    );
    await util
      .promisify(deleteStatement.run.bind(deleteStatement, [channelId]))
      .call(deleteStatement);

    deleteStatement.finalize();
  }
  async exist(channelId: string) {
    const cntResult = (await util
      .promisify(
        this.database.all.bind(
          this.database,
          `select count(*) as cnt from channel where channelId = ${channelId}`,
        ),
      )
      .call(this.database)) as countRow[];
    return cntResult[0].cnt > 0;
  }
  async getAllId() {
    const channelResult = (await util
      .promisify(
        this.database.all.bind(this.database, "select channelId from channel"),
      )
      .call(this.database)) as channelRow[];
    return channelResult;
  }
}
