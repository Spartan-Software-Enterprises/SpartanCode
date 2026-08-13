import {
  listCompatibleModels,
  licensedMobileModels,
  validateModelLicense,
} from "./model-catalog";

describe("licensed mobile model catalog", () => {
  it("contains only explicitly permissive licenses", () => {
    expect(licensedMobileModels.every(validateModelLicense)).toBe(true);
  });

  it("filters models by device memory without allowing unknown devices to download", () => {
    expect(listCompatibleModels({ totalMemoryMb: 3072 })).toHaveLength(1);
    expect(listCompatibleModels({ totalMemoryMb: 2048 })).toHaveLength(0);
  });
});
