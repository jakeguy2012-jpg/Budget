import { apiGet, apiPost } from "./api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export interface User {
  id: string;
  name: string;
  username: string;
  role: string;
  householdId: string;
  householdName: string;
}

export function useMe() {
  return useQuery<User | null>({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await apiGet<User>("/auth/me");
      } catch {
        return null;
      }
    },
  });
}

export function useLogin() {
  const qc = useQueryClient();
  const [, nav] = useLocation();
  return useMutation({
    mutationFn: (data: { username: string; password: string }) =>
      apiPost<User>("/auth/login", data),
    onSuccess: (user) => {
      qc.setQueryData(["me"], user);
      nav("/dashboard");
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  const [, nav] = useLocation();
  return useMutation({
    mutationFn: () => apiPost("/auth/logout", {}),
    onSuccess: () => {
      qc.setQueryData(["me"], null);
      qc.clear();
      nav("/login");
    },
  });
}
