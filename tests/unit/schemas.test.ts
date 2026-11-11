import { describe, expect, it } from "vitest";
import { normalizeMaliPhone } from "@/shared/phone";
import { maskName } from "@/shared/domain/privacy";
import { inquirySchema, trackingSchema } from "@/shared/schemas/public";
import { changePasswordSchema, repairIntakeSchema, settingsSchema, staffUserSchema } from "@/shared/schemas/staff";

describe("Mali phone numbers (ASSUMPTION 8)", () => {
  it.each([
    ["70 12 34 56", "+22370123456"],
    ["+223 70123456", "+22370123456"],
    ["0022370123456", "+22370123456"],
    ["70.12.34.56", "+22370123456"],
  ])("%s → %s", (input, out) => expect(normalizeMaliPhone(input)).toBe(out));
  it("rejects anything that is not 8 digits", () => {
    expect(normalizeMaliPhone("7012345")).toBeNull();
    expect(normalizeMaliPhone("+221 77 000 00 03")).toBeNull();
  });
});

describe("forms", () => {
  const intake = {
    customerName: "Awa",
    customerPhone: "70123456",
    brand: "Tecno",
    model: "Spark 10",
    color: "",
    imei: "",
    fault: "Écran",
    conditionNotes: "",
    accessories: "",
    lines: [],
    deposit: 0,
    depositMethod: "cash" as const,
  };
  it("a fixed-price ticket needs at least one line", () => {
    expect(repairIntakeSchema.safeParse({ ...intake, mode: "fixed" }).success).toBe(false);
    expect(repairIntakeSchema.safeParse({ ...intake, mode: "quote" }).success).toBe(true);
  });

  it("staff usernames are lowercase and limited to safe characters", () => {
    const base = { name: "A", role: "technician", password: "motdepasse1" };
    expect(staffUserSchema.parse({ ...base, username: "  Aissata.K " }).username).toBe("aissata.k");
    expect(staffUserSchema.safeParse({ ...base, username: "a b" }).success).toBe(false);
  });

  it("a password change must confirm and differ", () => {
    expect(changePasswordSchema.safeParse({ currentPassword: "ancien123", newPassword: "nouveau123", confirmPassword: "nouveau12" }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: "pareil123", newPassword: "pareil123", confirmPassword: "pareil123" }).success).toBe(false);
  });

  it("settings validate hours and normalize prefixes", () => {
    const settings = {
      name: "Shalom",
      address: "Sénou",
      city: "Bamako",
      phones: ["70123456"],
      whatsapp: "70123456",
      email: "",
      terms: "",
      quoteReady: "x",
      repairReady: "y",
      hours: [{ days: "Lundi", open: "08:00", close: "20:00" }],
      mapUrl: "",
      mapEmbedUrl: "",
      taxRate: 0,
      salePrefix: "v",
      invoicePrefix: "fac",
    };
    const ok = settingsSchema.parse(settings);
    expect(ok.salePrefix).toBe("V");
    expect(ok.invoicePrefix).toBe("FAC");
    expect(settingsSchema.safeParse({ ...settings, hours: [{ days: "Lundi", open: "20:00", close: "08:00" }] }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, mapUrl: "http://insecure.example" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...settings, taxRate: 101 }).success).toBe(false);
  });

  it("the honeypot passes validation so bots get no signal", () => {
    expect(inquirySchema.safeParse({ type: "contact", name: "Bot", phone: "70123456", device: "", message: "m", website: "http://spam" }).success).toBe(true);
  });

  it("tracking codes are SS- plus 6 characters, case-insensitive", () => {
    expect(trackingSchema.parse({ code: "ss-7k3m9q", phone: "70123456" }).code).toBe("SS-7K3M9Q");
    expect(trackingSchema.safeParse({ code: "SS-123", phone: "70123456" }).success).toBe(false);
  });
});

describe("public tracking privacy", () => {
  it("masks every name but the first", () => {
    expect(maskName("Mamadou Traoré")).toBe("Mamadou T.");
    expect(maskName("  Awa  Fatoumata  Diallo ")).toBe("Awa F. D.");
    expect(maskName("Moussa")).toBe("Moussa");
  });
});
