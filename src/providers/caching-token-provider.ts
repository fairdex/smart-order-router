import { Token } from "@basex-fi/sdk-core";
import _ from "lodash";

import { log, WRAPPED_NATIVE_CURRENCY } from "../util";

import { ICache } from "./cache";
import {
  ITokenProvider,
  TokenAccessor,
  USDC_BASE,
  USDC_BASE_GOERLI,
} from "./token-provider";

// These tokens will added to the Token cache on initialization.
export const CACHE_SEED_TOKENS: Record<number, { [symbol: string]: Token }> = {
  8453: {
    USDC: USDC_BASE,
    WETH: WRAPPED_NATIVE_CURRENCY[8453]!,
  },
  84531: {
    USDC: USDC_BASE_GOERLI,
    WETH: WRAPPED_NATIVE_CURRENCY[84531]!,
  },
};
// Currently we do not have providers for Moonbeam mainnet or Gnosis testnet

/**
 * Provider for getting token metadata that falls back to a different provider
 * in the event of failure.
 *
 * @export
 * @class CachingTokenProviderWithFallback
 */
export class CachingTokenProviderWithFallback implements ITokenProvider {
  private CACHE_KEY = (chainId: number, address: string) =>
    `token-${chainId}-${address}`;

  constructor(
    protected chainId: number,
    // Token metadata (e.g. symbol and decimals) don't change so can be cached indefinitely.
    // Constructing a new token object is slow as sdk-core does checksumming.
    private tokenCache: ICache<Token>,
    protected primaryTokenProvider: ITokenProvider,
    protected fallbackTokenProvider?: ITokenProvider
  ) { }

  public async getTokens(_addresses: string[]): Promise<TokenAccessor> {
    const seedTokens = CACHE_SEED_TOKENS[this.chainId];

    if (seedTokens) {
      for (const token of Object.values(seedTokens)) {
        await this.tokenCache.set(
          this.CACHE_KEY(this.chainId, token.address.toLowerCase()),
          token
        );
      }
    }

    const addressToToken: { [address: string]: Token } = {};
    const symbolToToken: { [symbol: string]: Token } = {};

    const addresses = _(_addresses)
      .map((address) => address.toLowerCase())
      .uniq()
      .value();

    const addressesToFindInPrimary = [];
    const addressesToFindInSecondary = [];

    for (const address of addresses) {
      if (await this.tokenCache.has(this.CACHE_KEY(this.chainId, address))) {
        addressToToken[address.toLowerCase()] = (await this.tokenCache.get(
          this.CACHE_KEY(this.chainId, address)
        ))!;
        symbolToToken[addressToToken[address]!.symbol!] =
          (await this.tokenCache.get(this.CACHE_KEY(this.chainId, address)))!;
      } else {
        addressesToFindInPrimary.push(address);
      }
    }

    log.info(
      { addressesToFindInPrimary },
      `Found ${addresses.length - addressesToFindInPrimary.length} out of ${addresses.length
      } tokens in local cache. ${addressesToFindInPrimary.length > 0
        ? `Checking primary token provider for ${addressesToFindInPrimary.length} tokens`
        : ``
      }
      `
    );

    if (addressesToFindInPrimary.length > 0) {
      const primaryTokenAccessor = await this.primaryTokenProvider.getTokens(
        addressesToFindInPrimary
      );

      for (const address of addressesToFindInPrimary) {
        const token = primaryTokenAccessor.getTokenByAddress(address);

        if (token) {
          addressToToken[address.toLowerCase()] = token;
          symbolToToken[addressToToken[address]!.symbol!] = token;
          await this.tokenCache.set(
            this.CACHE_KEY(this.chainId, address.toLowerCase()),
            addressToToken[address]!
          );
        } else {
          addressesToFindInSecondary.push(address);
        }
      }

      log.info(
        { addressesToFindInSecondary },
        `Found ${addressesToFindInPrimary.length - addressesToFindInSecondary.length
        } tokens in primary. ${this.fallbackTokenProvider
          ? `Checking secondary token provider for ${addressesToFindInSecondary.length} tokens`
          : `No fallback token provider specified. About to return.`
        }`
      );
    }

    if (this.fallbackTokenProvider && addressesToFindInSecondary.length > 0) {
      const secondaryTokenAccessor = await this.fallbackTokenProvider.getTokens(
        addressesToFindInSecondary
      );

      for (const address of addressesToFindInSecondary) {
        const token = secondaryTokenAccessor.getTokenByAddress(address);
        if (token) {
          addressToToken[address.toLowerCase()] = token;
          symbolToToken[addressToToken[address]!.symbol!] = token;
          await this.tokenCache.set(
            this.CACHE_KEY(this.chainId, address.toLowerCase()),
            addressToToken[address]!
          );
        }
      }
    }

    return {
      getTokenByAddress: (address: string): Token | undefined => {
        return addressToToken[address.toLowerCase()];
      },
      getTokenBySymbol: (symbol: string): Token | undefined => {
        return symbolToToken[symbol.toLowerCase()];
      },
      getAllTokens: (): Token[] => {
        return Object.values(addressToToken);
      },
    };
  }
}