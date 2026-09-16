import { repository } from "./repository";
import { filterBoards } from "../filters";
export function getPublishedBoards() { return filterBoards(repository().published(), {}); }
