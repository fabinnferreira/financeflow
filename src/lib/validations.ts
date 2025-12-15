import { z } from "zod";

// Category validation schema
export const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Nome é obrigatório" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  emoji: z
    .string()
    .trim()
    .min(1, { message: "Emoji é obrigatório" })
    .max(10, { message: "Emoji deve ter no máximo 10 caracteres" }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { message: "Cor inválida" }),
  type: z.enum(["expense", "income"], {
    errorMap: () => ({ message: "Tipo deve ser despesa ou receita" }),
  }),
});

export type CategoryFormData = z.infer<typeof categorySchema>;

// Account validation schema
export const accountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Nome é obrigatório" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  type: z.enum(["bank", "credit_card", "cash"], {
    errorMap: () => ({ message: "Tipo de conta inválido" }),
  }),
  balance: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), {
      message: "Saldo deve ser um número válido",
    })
    .refine((val) => parseFloat(val) >= -999999999 && parseFloat(val) <= 999999999, {
      message: "Saldo deve estar dentro do limite permitido",
    }),
});

export type AccountFormData = z.infer<typeof accountSchema>;

// Transaction validation schema
export const transactionSchema = z.object({
  type: z.enum(["expense", "income"], {
    errorMap: () => ({ message: "Tipo deve ser despesa ou receita" }),
  }),
  description: z
    .string()
    .trim()
    .min(1, { message: "Descrição é obrigatória" })
    .max(255, { message: "Descrição deve ter no máximo 255 caracteres" }),
  amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Valor deve ser um número positivo",
    })
    .refine((val) => parseFloat(val) <= 999999999, {
      message: "Valor deve estar dentro do limite permitido",
    }),
  account_id: z
    .string()
    .min(1, { message: "Selecione uma conta" }),
  category_id: z
    .string()
    .min(1, { message: "Selecione uma categoria" }),
  date: z
    .string()
    .min(1, { message: "Data é obrigatória" })
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Data inválida",
    }),
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// Goal validation schema
export const goalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Nome é obrigatório" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  target_amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Valor deve ser um número positivo",
    })
    .refine((val) => parseFloat(val) <= 999999999, {
      message: "Valor deve estar dentro do limite permitido",
    }),
  current_amount: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: "Valor deve ser um número não negativo",
    })
    .refine((val) => parseFloat(val) <= 999999999, {
      message: "Valor deve estar dentro do limite permitido",
    }),
  deadline: z
    .string()
    .optional(),
  emoji: z
    .string()
    .trim()
    .min(1, { message: "Emoji é obrigatório" })
    .max(10, { message: "Emoji deve ter no máximo 10 caracteres" }),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, { message: "Cor inválida" }),
});

export type GoalFormData = z.infer<typeof goalSchema>;
