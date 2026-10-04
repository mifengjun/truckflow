import { createInitialState, stateSchema, type PrototypeState } from "./model";
export const STORAGE_KEY = "truckflow.prototype.v1";
export function loadState(raw: string | null): PrototypeState {
  try {
    const parsed = JSON.parse(raw ?? "");
    // Empty numeric inputs serialize NaN as null; preserve the rest of a draft.
    const draft = parsed?.draft;
    if (draft) {
      for (const key of [
        "pallets",
        "length",
        "width",
        "height",
        "palletWeight",
      ]) {
        if (draft[key] === null) draft[key] = 0;
      }
      if (Array.isArray(draft.goods))
        for (const good of draft.goods) {
          if (good)
            for (const key of ["quantity", "weight", "value"]) {
              if (good[key] === null) good[key] = 0;
            }
        }
    }
    return stateSchema.parse(parsed);
  } catch {
    return createInitialState();
  }
}
