import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useConnection, useAnchorWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { Program, AnchorProvider } from '@coral-xyz/anchor'
import twitterIdl from '../idl/twitter.json'
import type { Twitter } from '../idl/twitter'
import { useToast } from '../hooks/useToast'

interface ProgramContextType {
  program: Program<Twitter> | null
  programId: PublicKey | null
  isLoading: boolean
  error: string | null
  tweets: Tweet[]
  commentsByTweet: Record<string, Comment[]>
  refreshTweets: () => Promise<void>
  addReaction: (tweetPublicKey: PublicKey, reactionType: 0 | 1) => Promise<void>
  removeReaction: (tweetPublicKey: PublicKey) => Promise<void>
  addComment: (tweetPublicKey: PublicKey, content: string) => Promise<void>
  removeComment: (commentPublicKey: PublicKey) => Promise<void>
}

export interface Tweet {
  publicKey: PublicKey
  author: PublicKey
  topic: string
  content: string
  likes: number
  dislikes: number
}

export interface Comment {
  publicKey: PublicKey
  author: PublicKey
  parentTweet: PublicKey
  content: string
}

const programIdStr = import.meta.env.VITE_TWITTER_PROGRAM_ID

if (!programIdStr) {
  throw new Error('VITE_TWITTER_PROGRAM_ID is not set')
}

const PROGRAM_ID = new PublicKey(programIdStr)

const ProgramContext = createContext<ProgramContextType | undefined>(undefined)

export const useProgram = () => {
  const context = useContext(ProgramContext)
  if (!context) {
    throw new Error('useProgram must be used within a ProgramProvider')
  }
  return context
}

interface ProgramProviderProps {
  children: ReactNode
}

export const ProgramProvider: React.FC<ProgramProviderProps> = ({ children }) => {
  const { connection } = useConnection()
  const wallet = useAnchorWallet()
  const { showToast } = useToast()

  const [program, setProgram] = useState<Program<Twitter> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [commentsByTweet, setCommentsByTweet] = useState<Record<string, Comment[]>>({})
  const [userReactions, setUserReactions] = useState<Record<string, 'like' | 'dislike'>>({})
  const publicKey = wallet?.publicKey ?? null

  useEffect(() => {
    if (!connection) {
      setProgram(null)
      setIsLoading(false)
      return
    }
  
    if (!wallet || !wallet.publicKey) {
      setProgram(null)
      setIsLoading(false)
      return
    }
  
    setIsLoading(true)
  
    try {
      const provider = new AnchorProvider(connection, wallet, {
        preflightCommitment: 'confirmed',
      })
      const idl = {
        ...(twitterIdl as Twitter),
        address: PROGRAM_ID.toBase58(),
      }
      const programInstance = new Program<Twitter>(idl as Twitter, provider)
      setProgram(programInstance)
      setError(null)
    } catch (err) {
      console.error('Error initializing program:', err)
      setError(`Failed to initialize program: ${err}`)
      setProgram(null)
    } finally {
      setIsLoading(false)
    }
  }, [connection, wallet])

  const refreshTweets = async () => {
    if (!program) return

    try {
      setIsLoading(true)

      const [tweetAccounts, reactionAccounts, commentAccounts] = await Promise.all([
        program.account.tweet.all(),
        program.account.reaction.all(),
        program.account.comment.all(),
      ])

      const mappedTweets: Tweet[] = tweetAccounts.map((t) => ({
        publicKey: t.publicKey,
        author: t.account.tweetAuthor,
        topic: t.account.topic,
        content: t.account.content,
        likes: Number(t.account.likes),
        dislikes: Number(t.account.dislikes),
      }))

      const reactionsByTweet: Record<string, 'like' | 'dislike'> = {}

      if (publicKey) {
        reactionAccounts.forEach((reactionAccount) => {
          if (reactionAccount.account.reactionAuthor.equals(publicKey)) {
            const tweetKey = reactionAccount.account.parentTweet.toBase58()
            const reactionValue = reactionAccount.account.reaction as { like?: unknown; dislike?: unknown }

            if ('like' in reactionValue) {
              reactionsByTweet[tweetKey] = 'like'
            } else if ('dislike' in reactionValue) {
              reactionsByTweet[tweetKey] = 'dislike'
            }
          }
        })
      }

      const commentsMap: Record<string, Comment[]> = {}

      commentAccounts.forEach((commentAccount) => {
        const tweetKey = commentAccount.account.parentTweet.toBase58()

        const comment: Comment = {
          publicKey: commentAccount.publicKey,
          author: commentAccount.account.commentAuthor,
          parentTweet: commentAccount.account.parentTweet,
          content: commentAccount.account.content,
        }

        if (!commentsMap[tweetKey]) {
          commentsMap[tweetKey] = []
        }

        commentsMap[tweetKey].push(comment)
      })

      setTweets(mappedTweets)
      setUserReactions(reactionsByTweet)
      setCommentsByTweet(commentsMap)
      setError(null)
    } catch (err) {
      console.error('Error fetching tweets:', err)
      setError('Failed to fetch tweets')
      showToast('Failed to load tweets', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (program) {
      refreshTweets()
    }
  }, [program])

  const addReaction = async (tweetPublicKey: PublicKey, reactionType: 0 | 1) => {
    if (!program || !publicKey) {
      showToast('Please connect your wallet first', 'error')
      return
    }

    const tweetKey = tweetPublicKey.toBase58()
    const currentReaction = userReactions[tweetKey]
    const desiredReaction: 'like' | 'dislike' = reactionType === 0 ? 'like' : 'dislike'

    try {
      const methods = (program as any).methods

      if (currentReaction === desiredReaction) {
        await methods
          .reactionRemove()
          .accounts({
            reactionAuthor: publicKey,
            tweet: tweetPublicKey,
          })
          .rpc()

        showToast('Reaction removed successfully!', 'success')
      } else {
        if (currentReaction) {
          await methods
            .reactionRemove()
            .accounts({
              reactionAuthor: publicKey,
              tweet: tweetPublicKey,
            })
            .rpc()
        }

        const method =
          reactionType === 0 ? methods.likeTweet() : methods.dislikeTweet()

        await method
          .accounts({
            reactionAuthor: publicKey,
            tweet: tweetPublicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        showToast('Reaction updated successfully!', 'success')
      }

      await refreshTweets()
    } catch (err) {
      console.error('Error updating reaction:', err)
      showToast('Failed to update reaction', 'error')
    }
  }

  const removeReaction = async (tweetPublicKey: PublicKey) => {
    if (!program || !publicKey) {
      showToast('Please connect your wallet first', 'error')
      return
    }

    try {
      const methods = (program as any).methods

      await methods
        .reactionRemove()
        .accounts({
          reactionAuthor: publicKey,
          tweet: tweetPublicKey,
        })
        .rpc()

      showToast('Reaction removed successfully!', 'success')
      await refreshTweets()
    } catch (err) {
      console.error('Error removing reaction:', err)
      showToast('Failed to remove reaction', 'error')
    }
  }

  const addComment = async (tweetPublicKey: PublicKey, content: string) => {
    if (!program || !publicKey) {
      showToast('Please connect your wallet first', 'error')
      return
    }

    const trimmed = content.trim()

    if (!trimmed) {
      showToast('Comment cannot be empty', 'error')
      return
    }

    if (trimmed.length > 500) {
      showToast('Comment must be 500 characters or less', 'error')
      return
    }

    try {
      const methods = (program as any).methods

      const encoder = new TextEncoder()
      const contentBytes = encoder.encode(trimmed)
      const hashBuffer = await crypto.subtle.digest('SHA-256', contentBytes as unknown as BufferSource)
      const contentHash = new Uint8Array(hashBuffer)

      const [commentPublicKey] = PublicKey.findProgramAddressSync(
        [
          encoder.encode('COMMENT_SEED'),
          publicKey.toBuffer(),
          contentHash,
          tweetPublicKey.toBuffer(),
        ],
        program.programId
      )

      await methods
        .commentTweet(trimmed)
        .accounts({
          commentAuthor: publicKey,
          tweet: tweetPublicKey,
          comment: commentPublicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()

      showToast('Comment added successfully!', 'success')
      await refreshTweets()
    } catch (err) {
      console.error('Error adding comment:', err)
      showToast('Failed to add comment', 'error')
    }
  }

  const removeComment = async (commentPublicKey: PublicKey) => {
    if (!program || !publicKey) {
      showToast('Please connect your wallet first', 'error')
      return
    }

    try {
      const methods = (program as any).methods

      await methods
        .commentRemove()
        .accounts({
          commentAuthor: publicKey,
          comment: commentPublicKey,
        })
        .rpc()

      showToast('Comment removed successfully!', 'success')
      await refreshTweets()
    } catch (err) {
      console.error('Error removing comment:', err)
      showToast('Failed to remove comment', 'error')
    }
  }

  const value: ProgramContextType = {
    program,
    programId: PROGRAM_ID,
    isLoading,
    error,
    tweets,
    commentsByTweet,
    refreshTweets,
    addReaction,
    removeReaction,
    addComment,
    removeComment,
  }

  return (
    <ProgramContext.Provider value={value}>
      {children}
    </ProgramContext.Provider>
  )
}