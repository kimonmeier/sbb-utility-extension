import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const todoTable = sqliteTable("todos", {
  title: text("title").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  description: text("description"),
});

export const schema = { todoTable };
