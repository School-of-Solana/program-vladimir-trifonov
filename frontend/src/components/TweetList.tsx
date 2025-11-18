import React, { useEffect, useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useProgram } from '../contexts/ProgramContext'

const TweetList: React.FC = () => {
  const { publicKey } = useWallet()
  const {
    tweets,
    commentsByTweet,
    isLoading,
    error,
    refreshTweets,
    addReaction,
    addComment,
    removeComment,
  } = useProgram()
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTweets()
    }, 30000)

    return () => clearInterval(interval)
  }, [refreshTweets])

  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const getTweetComments = (tweetKey: string) => commentsByTweet[tweetKey] || []


  if (isLoading) {
    return (
      <div className="tweet-list">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading tweets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="tweet-list">
        <div style={{ textAlign: 'center', padding: '20px', color: '#e74c3c' }}>
          Error: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="tweet-list">
      <h3>Recent Tweets</h3>
      {tweets.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#657786', padding: '20px' }}>
          No tweets yet. Be the first to tweet!
        </p>
      ) : (
        <div className="tweets-container">
          {tweets.map((tweet) => (
            <div key={tweet.publicKey.toBase58()} className="tweet">
              <div className="tweet-header">
                <div className="tweet-author">
                  <strong>@{formatAddress(tweet.author.toBase58())}</strong>
                </div>
              </div>

              <div className="tweet-content">
                {tweet.topic && <h4 className="tweet-topic">{tweet.topic}</h4>}
                <p className="tweet-text">{tweet.content}</p>
              </div>

              <div className="tweet-actions">
                <button
                  className="action-button like-button"
                  onClick={() => addReaction(tweet.publicKey, 0)}
                >
                  ❤️ {tweet.likes}
                </button>
                <button
                  className="action-button comment-button"
                  onClick={() => addReaction(tweet.publicKey, 1)}
                >
                  👎 {tweet.dislikes}
                </button>
              </div>

              <div className="tweet-comments">
                <div className="comment-input-row">
                  <input
                    type="text"
                    value={commentInputs[tweet.publicKey.toBase58()] || ''}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [tweet.publicKey.toBase58()]: e.target.value,
                      }))
                    }
                    placeholder="Add a comment..."
                    className="tweet-input"
                  />
                  <button
                    className="action-button comment-button"
                    onClick={() => {
                      const key = tweet.publicKey.toBase58()
                      const text = (commentInputs[key] || '').trim()
                      if (!text) {
                        return
                      }
                      addComment(tweet.publicKey, text)
                      setCommentInputs((prev) => ({ ...prev, [key]: '' }))
                    }}
                  >
                    Comment
                  </button>
                </div>

                {getTweetComments(tweet.publicKey.toBase58()).length > 0 && (
                  <ul className="comment-list">
                    {getTweetComments(tweet.publicKey.toBase58()).map((comment) => (
                      <li
                        key={comment.publicKey.toBase58()}
                        className="comment-item"
                      >
                        <span className="comment-author">
                          @{formatAddress(comment.author.toBase58())}
                        </span>
                        <span className="comment-content">{comment.content}</span>
                        {publicKey && comment.author.equals(publicKey) && (
                          <button
                            className="action-button comment-button"
                            onClick={() => removeComment(comment.publicKey)}
                          >
                            Delete
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default TweetList