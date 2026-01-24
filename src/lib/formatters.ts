import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Centralized formatting utilities for the application
 */

/**
 * Format a value in cents to Brazilian Real currency
 */
export const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
};

/**
 * Format a value (already in currency units, not cents) to Brazilian Real
 */
export const formatCurrencyValue = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

/**
 * Format a number (not cents) to Brazilian Real currency string without symbol
 * Used for PDF/Excel exports where R$ is added separately
 */
export const formatCurrencyRaw = (value: number): string => {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format a date string to Brazilian locale (dd/MM/yyyy)
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

/**
 * Format a date string to Brazilian locale with time (dd/MM/yyyy HH:mm)
 */
export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-BR');
};

/**
 * Format a date string with custom format using date-fns
 * Returns "Nunca" if dateString is null
 */
export const formatDateWithTime = (dateString: string | null): string => {
  if (!dateString) return 'Nunca';
  return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
};

/**
 * Format a date for display with month name (ex: "15 de janeiro de 2024")
 */
export const formatDateFull = (dateString: string): string => {
  return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
};
