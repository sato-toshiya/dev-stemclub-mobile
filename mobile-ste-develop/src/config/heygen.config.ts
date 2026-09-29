import { CreateClientConfig } from "@/client/client"
import Config from "@/config"

export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseURL: Config.API_URL,
  timeout: 10000, // 10 seconds
})
