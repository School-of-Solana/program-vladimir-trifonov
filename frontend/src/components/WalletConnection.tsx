import React, { useEffect, useMemo, useState } from 'react'
import type { WalletName } from '@solana/wallet-adapter-base'
import { useWallet } from '@solana/wallet-adapter-react'

const WalletConnection: React.FC = () => {
  const {
    wallet,
    wallets,
    connect,
    disconnect,
    publicKey,
    connecting,
    select,
  } = useWallet()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    setIsConnecting(connecting)
  }, [connecting])

  const handleConnect = async () => {
    if (!wallet) {
      setIsModalOpen(true)
      return
    }

    setIsConnecting(true)
    try {
      await connect()
    } catch (error) {
      console.error('Connection failed:', error)
      setIsModalOpen(true)
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await disconnect()
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const uniqueWallets = useMemo(() => {
    const seen = new Set<string>()
    return wallets.filter(({ adapter }) => {
      const name = adapter.name
      if (seen.has(name)) return false
      seen.add(name)
      return true
    })
  }, [wallets])

  const handleSelectWallet = async (walletName: WalletName) => {
    setIsConnecting(true)
    try {
      const target = wallets.find(({ adapter }) => adapter.name === walletName)
      if (!target) {
        throw new Error(`Wallet ${walletName} not found`)
      }

      select(walletName)
      await target.adapter.connect()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to connect from modal:', error)
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <div className="wallet-section">
      {publicKey ? (
        <div className="wallet-connected">
          <div className="wallet-info">
            <span className="wallet-label">Connected:</span>
            <span className="wallet-address">
              {formatAddress(publicKey.toBase58())}
            </span>
            <span className="wallet-name">{wallet?.adapter?.name}</span>
          </div>
          <button
            onClick={handleDisconnect}
            className="wallet-button disconnect"
            disabled={isConnecting}
          >
            {isConnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      ) : (
        <div className="wallet-disconnected">
          <p className="wallet-prompt">Connect your wallet to start tweeting!</p>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="wallet-button connect"
          >
            {isConnecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="wallet-modal-overlay" onClick={handleCloseModal}>
          <div
            className="wallet-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="wallet-modal-header">
              <h2 className="wallet-modal-title">Choose a wallet</h2>
              <button
                type="button"
                className="wallet-modal-close"
                onClick={handleCloseModal}
              >
                x
              </button>
            </div>
            <ul className="wallet-modal-list">
              {uniqueWallets.map(({ adapter }) => (
                <li key={adapter.name} className="wallet-modal-item">
                  <button
                    type="button"
                    className="wallet-modal-item-button"
                    onClick={() => handleSelectWallet(adapter.name)}
                    disabled={isConnecting}
                  >
                    {adapter.icon && (
                      <img
                        src={adapter.icon}
                        alt={`${adapter.name} icon`}
                        className="wallet-modal-icon"
                      />
                    )}
                    <span className="wallet-modal-item-name">
                      {adapter.name}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletConnection
