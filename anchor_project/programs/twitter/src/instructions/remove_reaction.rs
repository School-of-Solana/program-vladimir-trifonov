use anchor_lang::prelude::*;

use crate::errors::TwitterError;
use crate::states::*;

pub fn remove_reaction(ctx: Context<RemoveReactionContext>) -> Result<()> {
    let tweet = &mut ctx.accounts.tweet;
    let reaction = ctx.accounts.tweet_reaction.reaction.clone();

    match reaction {
        ReactionType::Like => {
            require!(tweet.likes > 0, TwitterError::MinLikesReached);
            tweet.likes = tweet.likes.saturating_sub(1);
        }
        ReactionType::Dislike => {
            require!(tweet.dislikes > 0, TwitterError::MinDislikesReached);
            tweet.dislikes = tweet.dislikes.saturating_sub(1);
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RemoveReactionContext<'info> {
    #[account(mut)]
    pub reaction_author: Signer<'info>,
    #[account(
        mut,
        seeds = [
            tweet.topic.as_bytes(),
            TWEET_SEED.as_bytes(),
            tweet.tweet_author.as_ref()
        ],
        bump = tweet.bump
    )]
    pub tweet: Account<'info, Tweet>,
    #[account(
        mut,
        close = reaction_author,
        seeds = [
            TWEET_REACTION_SEED.as_bytes(),
            reaction_author.key().as_ref(),
            tweet.key().as_ref(),
        ],
        bump = tweet_reaction.bump
    )]
    pub tweet_reaction: Account<'info, Reaction>,
}
