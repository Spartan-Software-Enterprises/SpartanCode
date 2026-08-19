import {
  createHuggingFaceModel,
  listCompatibleModels,
  licensedMobileModels,
  validateModelLicense,
} from "./model-catalog";

describe("licensed mobile model catalog", () => {
  it("contains models with various permissive and community licenses", () => {
    expect(licensedMobileModels.length).toBeGreaterThan(5);
    const permissive = licensedMobileModels.filter(validateModelLicense);
    expect(permissive.length).toBeGreaterThanOrEqual(2);
  });

  it("filters models by device memory without allowing unknown devices to download", () => {
    expect(listCompatibleModels({ totalMemoryMb: 8192 })).toHaveLength(
      licensedMobileModels.length,
    );
    expect(listCompatibleModels({ totalMemoryMb: 1024 })).toHaveLength(0);
  });

  it("preserves explicitly selected community, uncensored, and distilled metadata", () => {
    const model = createHuggingFaceModel({
      id: "community/uncensored-distilled",
      provider: "Community",
      license: "other",
      quantizations: ["Q4_0"],
      minimumMemoryMb: 6144,
      uncensored: true,
      distilled: true,
    });
    expect(model).toMatchObject({
      id: "community/uncensored-distilled",
      license: "other",
      source: "huggingface",
      communityModel: true,
      uncensored: true,
      distilled: true,
    });
    expect(model.quantizations).toEqual(["Q4_0"]);
    expect(validateModelLicense(model)).toBe(false);
  });

  it("rejects unbounded or incomplete community metadata", () => {
    expect(() =>
      createHuggingFaceModel({ id: "bad id", license: "MIT" }),
    ).toThrow("model id is invalid");
    expect(() =>
      createHuggingFaceModel({ id: "community/model", license: "" }),
    ).toThrow("license is required");
    expect(() =>
      createHuggingFaceModel({
        id: "community/model",
        license: "MIT",
        quantizations: [],
      }),
    ).toThrow("quantization");
  });
});
