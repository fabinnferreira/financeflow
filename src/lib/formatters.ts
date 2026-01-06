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
 * Format a date string to Brazilian locale
 */
export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('pt-BR');
};

/**
 * Format a date string to Brazilian locale with time
 */
export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('pt-BR');
};
