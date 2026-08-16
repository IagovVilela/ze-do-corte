import { describe, expect, it } from "vitest";

import { maskCpfCnpj, maskEmail, maskPhone } from "./pii-mask";

describe("pii-mask", () => {
  it("mascara telefone mostrando só os 4 últimos", () => {
    expect(maskPhone("12996373335")).toBe("••• ••• 3335");
  });

  it("mascara e-mail", () => {
    expect(maskEmail("dono@salao.com")).toBe("d•••@salao.com");
  });

  it("mascara CPF", () => {
    expect(maskCpfCnpj("12345678901")).toBe("•••.8901");
  });
});
