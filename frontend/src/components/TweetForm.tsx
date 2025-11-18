import React, { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { useProgram } from '../contexts/ProgramContext'
import { useToast } from '../hooks/useToast'

const TweetForm: React.FC = () => {
  const { publicKey } = useWallet()
  const { program, refreshTweets } = useProgram()
  const { showToast } = useToast()
  
  const [topic, setTopic] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateInputs = () => {
    if (topic.length === 0) {
      showToast('Topic cannot be empty', 'error')
      return false
    }
    if (topic.length > 32) {
      showToast('Topic must be 32 characters or less', 'error')
      return false
    }
    if (content.length === 0) {
      showToast('Content cannot be empty', 'error')
      return false
    }
    if (content.length > 500) {
      showToast('Content must be 500 characters or less', 'error')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!publicKey) {
      showToast('Please connect your wallet first', 'error')
      return
    }

    if (!program) {
      showToast('Program not loaded', 'error')
      return
    }

    if (!validateInputs()) {
      return
    }

    try {
      setIsLoading(true)

      const topicSeed = new TextEncoder().encode(topic)
      const tweetSeed = new TextEncoder().encode('TWEET_SEED')

      const [tweetPublicKey] = PublicKey.findProgramAddressSync(
        [topicSeed, tweetSeed, publicKey.toBuffer()],
        program.programId
      )

      const methods = (program as any).methods

      await methods
        .initialize(topic, content)
        .accounts({
          tweetAuthority: publicKey,
          tweet: tweetPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      showToast('Tweet created successfully!', 'success')
      setTopic('')
      setContent('')
      refreshTweets()
    } catch (error) {
      console.error('Error creating tweet:', error)
      showToast('Failed to create tweet', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  if (!publicKey) {
    return (
      <div className="tweet-form">
        <p style={{ textAlign: 'center', color: '#657786' }}>
          Connect your wallet to start tweeting!
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="tweet-form">
      <h3>Create a new tweet</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="topic" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Topic (max 32 chars)
        </label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="What's happening?"
          className="tweet-input"
          maxLength={32}
          disabled={isLoading}
        />
        <small style={{ color: '#657786' }}>
          {topic.length}/32 characters
        </small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="content" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Content (max 500 chars)
        </label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts..."
          className="tweet-input"
          rows={4}
          maxLength={500}
          disabled={isLoading}
        />
        <small style={{ color: '#657786' }}>
          {content.length}/500 characters
        </small>
      </div>

      <button 
        type="submit" 
        className="tweet-button"
        disabled={isLoading || !topic.trim() || !content.trim()}
      >
        {isLoading ? 'Posting...' : 'Post Tweet'}
      </button>
    </form>
  )
}

export default TweetForm