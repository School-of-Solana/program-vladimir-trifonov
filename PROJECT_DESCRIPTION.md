# Project Description

**Deployed Frontend URL:** `https://program-vladimir-trifonov.vercel.app`

**Solana Program ID:** `4rq9stpkpokshvPbijWyhmHmCkh89qoDvxUfE1eZPFYw`

## Project Overview

### Description
Program Twitter is a lean Twitter-style dApp on Solana. Wallet owners can create short-form posts (tweets) scoped by an optional topic, react with likes or dislikes, and leave threaded comments. Everything is stored on-chain through a single Anchor program so that the React/Vite frontend is only responsible for rendering data and sending signed transactions.

### Key Features
- Tweet creation: compose a topic (≤32 bytes) and content (≤500 bytes) and publish it as a PDA-derived account tied to the author.
- Like/Dislike reactions: one reaction per wallet per tweet, enforced with PDA seeds so duplicates are impossible.
- Reaction cleanup: any user can remove only their own reaction, reclaiming rent.
- Comment threads: wallets submit 500-byte comments on an existing tweet, also stored as PDAs keyed by the commenter and comment hash.
- Comment cleanup: commenters can delete their own comments, which closes the PDA and refunds lamports.
  
### How to Use the dApp
1. **Connect Wallet** – Open the frontend, select Phantom (tested) or another Solana wallet, and connect to Devnet.
2. **Create Tweet** – Enter a topic (optional) and up to 500 characters of content, then submit the transaction; the app derives the tweet PDA using `[topic, TWEET_SEED, author]`.
3. **React** – From the timeline, choose Like or Dislike; the client derives the reaction PDA and sends either `like_tweet` or `dislike_tweet`.
4. **Comment** – Open the tweet detail view, type your comment (≤500 bytes), and send `comment_tweet`.
5. **Remove Own Activity** – Use the "Remove Reaction" or "Delete Comment" buttons to invoke the corresponding removal instructions; the accounts close and lamports return to you.

## Program Architecture
The Anchor program exposes six core instructions: `initialize`, `like_tweet`, `dislike_tweet`, `reaction_remove`, `comment_tweet`, and `comment_remove`. Each instruction validates string lengths, derives deterministic PDAs, and uses Anchor's `InitSpace` macros to size accounts. The frontend talks to the on-chain program through the generated IDL; no off-chain database is required. Tweets track aggregate like/dislike counts, while reactions and comments live as standalone accounts so they can be individually closed.

### PDA Usage
We follow the exact seed formulas from the School of Solana reference to guarantee uniqueness and prevent duplicate actions:

**PDAs Used:**
- Tweet PDA: `seeds = [topic.as_bytes(), TWEET_SEED.as_bytes(), tweet_authority.key().as_ref()]` – ensures each author can create multiple tweets scoped by topic.
- Reaction PDA: `seeds = [TWEET_REACTION_SEED.as_bytes(), reaction_author.key().as_ref(), tweet.key().as_ref()]` – one reaction per user per tweet.
- Comment PDA: `seeds = [COMMENT_SEED.as_bytes(), comment_author.key().as_ref(), hash(comment_content).as_ref(), parent_tweet.key().as_ref()]` – distinguishes comments by both author and content hash so identical comments do not collide.

### Program Instructions

**Instructions Implemented:**
- `initialize` – creates a tweet account, stores author/topic/content, and zeroes like/dislike counters.
- `like_tweet` / `dislike_tweet` – derive/create a reaction PDA, ensure uniqueness (one reaction per user per tweet), and update the tweet's like/dislike counters.
- `reaction_remove` – closes the caller's reaction PDA, decrementing the corresponding counter and reclaiming rent.
- `comment_tweet` / `comment_remove` – create and close per-user comment PDAs linked to a parent tweet.

### Account Structure

```rust
#[account]
#[derive(InitSpace)]
pub struct Tweet {
    pub tweet_author: Pubkey,
    #[max_len(TOPIC_LENGTH)]
    pub topic: String,
    #[max_len(CONTENT_LENGTH)]
    pub content: String,
    pub likes: u64,
    pub dislikes: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Reaction {
    pub reaction_author: Pubkey,
    pub parent_tweet: Pubkey,
    pub reaction: ReactionType,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Comment {
    pub comment_author: Pubkey,
    pub parent_tweet: Pubkey,
    #[max_len(COMMENT_LENGTH)]
    pub content: String,
    pub bump: u8,
}
```

## Testing

### Test Coverage
The Anchor TypeScript test suite exercises the full lifecycle of tweets, reactions, and comments, including boundary cases and error handling.

**Happy Path Scenarios:**
- Initializing tweets with valid, empty, boundary-length, and Unicode topics/content.
- Adding like and dislike reactions from multiple users, including the tweet author.
- Adding comments of varying lengths (including empty and Unicode) from multiple users.
- Removing reactions and comments, verifying that PDAs are closed and aggregate counters remain consistent.

**Unhappy Path Scenarios:**
- Rejecting topics longer than 32 bytes and content/comments longer than 500 bytes.
- Preventing duplicate tweets for the same (author, topic) pair.
- Preventing duplicate reaction and comment PDAs for the same (author, tweet, content) combination.
- Disallowing operations on non-existent tweets, reactions, or comments.
- Ensuring only the original author can remove their own reaction or comment.

### Running Tests
```bash
# Commands to run your tests
anchor test
```

### Additional Notes for Evaluators

This project emphasizes a clear, well-tested Solana smart contract with straightforward tweet, reaction, and comment flows, paired with a simple React/Vite frontend that surfaces on-chain errors and validation feedback clearly to the user. Environment-driven configuration (program ID, RPC URL) and a vendored IDL make it easy to point the same frontend at different deployments without code changes, which should help you evaluate both the on-chain logic and the overall developer experience.
