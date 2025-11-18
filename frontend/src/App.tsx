import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'
import WalletConnection from './components/WalletConnection'
import TweetForm from './components/TweetForm'
import TweetList from './components/TweetList'
import Toast from './components/Toast'
import { ProgramProvider } from './contexts/ProgramContext'
import './App.css'
import './wallet-modal.css'

function App() {
  const network = WalletAdapterNetwork.Devnet
  const endpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(network)
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ]

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false} onError={(error) => console.error('Wallet error:', error)}>
        <ProgramProvider>
          <div className="app">
            <header className="app-header">
              <h1>🐦 Twitter-like Solana dApp</h1>
              <p>Create tweets, add reactions, and comments on Solana blockchain</p>
            </header>

            <WalletConnection />

            <main className="app-main">
              <TweetForm />
              <TweetList />
            </main>

            <Toast />
          </div>
        </ProgramProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default App