import { Token } from "@basex-fi/sdk-core";

export enum NativeCurrencyName {
  // Strings match input for CLI
  ETHER = "ETH",
  MATIC = "MATIC",
  CELO = "CELO",
  GNOSIS = "XDAI",
  MOONBEAM = "GLMR",
  BNB = "BNB",
  AVALANCHE = "AVAX",
}

export const NATIVE_NAMES: string[] = [
  "ETH",
  "ETHER",
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
];

export const NATIVE_CURRENCY = NativeCurrencyName.ETHER;

export const TO_PROVIDER = (chainId: number): string =>
({
  8453: process.env.JSON_RPC_PROVIDER_BASE,
  84531: process.env.JSON_RPC_PROVIDER_BASE_GOERLI,
}[chainId]!);

export const TO_NETWORK_NAME = (chainId: number): string =>
  ({ 8453: "base-mainnet", 84531: "base-goerli" }[chainId]!);

export const WRAPPED_NATIVE_CURRENCY: Record<number, Token> = {
  8453: new Token(
    "0x4200000000000000000000000000000000000006",
    18,
    "WETH",
    "Wrapped Ether",
    "https://assets.smold.app/api/token/8453/0x4200000000000000000000000000000000000006/logo.svg"
  ),
  84531: new Token(
    "0x88E1cE46b45CCD0a163D8D99b5a1C6C0503eeE59",
    18,
    "WETH",
    "Wrapped Ether",
    "https://assets.smold.app/api/token/8453/0x4200000000000000000000000000000000000006/logo.svg"
  ),
};
