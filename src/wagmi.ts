import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, arbitrum, gnosis, aurora } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia, arbitrum, gnosis, aurora],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [arbitrum.id]: http(),
    [gnosis.id]: http(),
    [aurora.id]: http(),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
