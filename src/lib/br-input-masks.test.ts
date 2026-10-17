import { describe, expect, it } from "vitest";

import {
  formatBrMoneyInput,
  formatBrPhoneNational,
  formatCep,
  formatCpfCnpj,
} from "./br-input-masks";

describe("br-input-masks", () => {
  it("mascara CPF progressivamente", () => {
    expect(formatCpfCnpj("123")).toBe("123");
    expect(formatCpfCnpj("12345678901")).toBe("123.456.789-01");
  });

  it("mascara CNPJ a partir de 12 dígitos", () => {
    expect(formatCpfCnpj("32323232323232")).toBe("32.323.232/3232-32");
  });

  it("mascara telefone nacional", () => {
    expect(formatBrPhoneNational("12987002929")).toBe("(12) 98700-2929");
  });

  it("mascara CEP", () => {
    expect(formatCep("12245700")).toBe("12245-700");
  });

  it("mascara dinheiro estilo centavos", () => {
    expect(formatBrMoneyInput("7900")).toBe("79,00");
  });
});
