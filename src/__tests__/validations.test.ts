import { describe, it, expect } from "vitest";
import {
  loginSchema,
  customerSchema,
  productSchema,
  createOrderSchema,
  registerPaymentSchema,
} from "@/types";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({
      email: "admin@imperial.com",
      password: "secret123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "notanemail",
      password: "secret123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "admin@imperial.com",
      password: "12345",
    });
    expect(result.success).toBe(false);
  });
});

describe("customerSchema", () => {
  it("accepts valid customer", () => {
    const result = customerSchema.safeParse({
      name: "Juan Perez",
      phone: "3001234567",
      address: "Calle 123",
    });
    expect(result.success).toBe(true);
  });

  it("requires name with minimum length", () => {
    const result = customerSchema.safeParse({ name: "J" });
    expect(result.success).toBe(false);
  });

  it("allows optional phone and address", () => {
    const result = customerSchema.safeParse({ name: "Juan Perez" });
    expect(result.success).toBe(true);
  });
});

describe("productSchema", () => {
  it("accepts valid product", () => {
    const result = productSchema.safeParse({
      name: "Producto Test",
      price: 10000,
      stock: 50,
      min_stock: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative price", () => {
    const result = productSchema.safeParse({
      name: "Test",
      price: -100,
      stock: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative stock", () => {
    const result = productSchema.safeParse({
      name: "Test",
      price: 100,
      stock: -1,
    });
    expect(result.success).toBe(false);
  });

  it("defaults min_stock to 5", () => {
    const result = productSchema.safeParse({
      name: "Test",
      price: 100,
      stock: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min_stock).toBe(5);
    }
  });
});

describe("createOrderSchema", () => {
  it("accepts valid order", () => {
    const result = createOrderSchema.safeParse({
      customer_id: "550e8400-e29b-41d4-a716-446655440000",
      items: [
        {
          product_id: "550e8400-e29b-41d4-a716-446655440001",
          quantity: 2,
          unit_price: 5000,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = createOrderSchema.safeParse({
      customer_id: "550e8400-e29b-41d4-a716-446655440000",
      items: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-uuid customer_id", () => {
    const result = createOrderSchema.safeParse({
      customer_id: "invalid",
      items: [
        {
          product_id: "550e8400-e29b-41d4-a716-446655440001",
          quantity: 1,
          unit_price: 1000,
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("registerPaymentSchema", () => {
  it("accepts valid full payment", () => {
    const result = registerPaymentSchema.safeParse({
      order_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 50000,
      type: "full",
      payment_method: "cash",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid partial payment", () => {
    const result = registerPaymentSchema.safeParse({
      order_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 20000,
      type: "partial",
      payment_method: "nequi",
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = registerPaymentSchema.safeParse({
      order_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 0,
      type: "full",
      payment_method: "cash",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid payment method", () => {
    const result = registerPaymentSchema.safeParse({
      order_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 1000,
      type: "full",
      payment_method: "bitcoin",
    });
    expect(result.success).toBe(false);
  });
});
