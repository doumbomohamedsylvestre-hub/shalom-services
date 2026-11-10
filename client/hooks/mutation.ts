"use client";

import { type QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/**
 * useMutation + the app's feedback convention: a French success toast,
 * the server's French error message as an error toast, and invalidation
 * of every affected entity root.
 */
export function useAppMutation<TVars, TData>(opts: {
  fn: (vars: TVars) => Promise<TData>;
  invalidate?: QueryKey[];
  success?: string | ((data: TData, vars: TVars) => string);
  onSuccess?: (data: TData, vars: TVars) => void;
}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: opts.fn,
    onSuccess: (data, vars) => {
      for (const key of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: key });
      if (opts.success) toast.success(typeof opts.success === "function" ? opts.success(data, vars) : opts.success);
      opts.onSuccess?.(data, vars);
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue. Réessayez.");
    },
  });
}
