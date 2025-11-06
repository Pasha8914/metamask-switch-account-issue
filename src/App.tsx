import {useMemo, useState} from 'react'
import {useAccount, useConnect, useDisconnect, usePublicClient, useSwitchChain, useWalletClient} from 'wagmi'

const UNISWAP_ADDRESSES: Record<number, string> = {
  42161: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
  100: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
  1313161554: '0x2CB45Edb4517d5947aFdE3BEAbF95A582506858B',
}

const APPROVE_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

function App() {
  const { disconnect } = useDisconnect()
  const { chains, switchChain } = useSwitchChain()
  const { connectors, connect, status, error } = useConnect()

  const account = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const [tokenAddress, setTokenAddress] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const uniswapAddress = useMemo(() => {
    return UNISWAP_ADDRESSES[publicClient.chain?.id || 0]
  }, [publicClient])

  const requestGasParams = async () => {
    if (!publicClient) {
      throw new Error('Public client is required')
    }
    try {
      const feesPerGas = (await publicClient.estimateFeesPerGas())
      const is1559 = 'maxFeePerGas' in feesPerGas

      return { feesPerGas, is1559 }
    } catch (error) {
      if ((error as Error).message.includes('1559')) {
        const gasPrice = await publicClient.getGasPrice()
        return {
          feesPerGas: { gasPrice },
          is1559: false,
        }
      }
      throw error
    }
  }

  const onHandleApprove = async () => {
    try {
      setErrorMessage(null)
      setTxHash(null)

      const address = account.address

      if (!address || !publicClient) {
        throw new Error('Wallet not Connected')
      }

      if (!uniswapAddress) {
        throw new Error('Target contract is required')
      }

      if (!tokenAddress) {
        throw new Error('Token is required')
      }

      // Maximum approval amount (2^256 - 1)
      const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')

      const params = {
        abi: APPROVE_ABI,
        account: address,
        functionName: 'approve',
        address: tokenAddress as `0x${string}`,
        args: [uniswapAddress as `0x${string}`, maxAmount],
      } as const

      const gasLimit = await publicClient.estimateContractGas(params)

      if (!walletClient) {
        throw new Error('Wallet client not available')
      }

      const gp = await requestGasParams()
      const hash = await walletClient.writeContract({
        ...params,
        ...gp.feesPerGas,
        gas: gasLimit,
      })

      console.log('Transaction hash:', hash)
      setTxHash(hash)
    } catch (error) {
      console.error('Approval error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <div>
          <h2>Account</h2>

          <div>
            status: {account.status}
            <br />
            addresses: {JSON.stringify(account.addresses)}
            <br />
            chainId: {account.chainId}
          </div>

          {account.status === 'connected' && (
            <button type="button" onClick={() => disconnect()}>
              Disconnect
            </button>
          )}
        </div>

        <div>
          <h2>Connect</h2>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              type="button"
            >
              {connector.name}
            </button>
          ))}
          <div>{status}</div>
          <div>{error?.message}</div>
        </div>

        {account.status === 'connected' && (
          <div style={{ marginTop: '20px' }}>
            <h2>Network</h2>
            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="networkSelect" style={{ display: 'block', marginBottom: '5px' }}>
                Select Network
              </label>
              <select
                id="networkSelect"
                value={account.chainId || ''}
                onChange={(e) => switchChain({ chainId: Number(e.target.value) as any })}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                {chains.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            <h2>Token Information</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label htmlFor="tokenAddress" style={{ display: 'block', marginBottom: '5px' }}>
                  Token Address
                </label>
                <input
                  id="tokenAddress"
                  type="text"
                  value={tokenAddress}
                  onChange={(e) => setTokenAddress(e.target.value)}
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                />
              </div>
              <div>
                <label htmlFor="uniswapAddress" style={{ display: 'block', marginBottom: '5px' }}>
                  Uniswap Router Address
                </label>
                <input
                  id="uniswapAddress"
                  type="text"
                  defaultValue={uniswapAddress}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'not-allowed',
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onHandleApprove}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#007bff'}
            >
              Approve
            </button>

            {errorMessage && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c6cb',
                borderRadius: '4px',
                color: '#721c24',
              }}>
                <strong>Error:</strong> {errorMessage}
              </div>
            )}

            {txHash && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '4px',
                color: '#155724',
              }}>
                <strong>Success!</strong> Transaction hash: {txHash}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App




