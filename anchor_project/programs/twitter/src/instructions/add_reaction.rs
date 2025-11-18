use anchor_lang::prelude::*;

use crate::errors::TwitterError;
use crate::states::*;

pub fn add_reaction(ctx: Context<AddReactionContext>, reaction: ReactionType) -> Result<()> {
    let tweet = &mut ctx.accounts.tweet;
    let tweet_reaction = &mut ctx.accounts.tweet_reaction;
    let reaction_author = &ctx.accounts.reaction_author;

    match reaction {
        ReactionType::Like => {
            require!(tweet.likes < u64::MAX, TwitterError::MaxLikesReached);
            tweet.likes = tweet.likes.saturating_add(1);
            tweet_reaction.reaction = ReactionType::Like;
        }
        ReactionType::Dislike => {
            require!(tweet.dislikes < u64::MAX, TwitterError::MaxDislikesReached);
            tweet.dislikes = tweet.dislikes.saturating_add(1);
            tweet_reaction.reaction = ReactionType::Dislike;
        }
    }

    tweet_reaction.reaction_author = reaction_author.key();
    tweet_reaction.parent_tweet = tweet.key();
    tweet_reaction.bump = ctx.bumps.tweet_reaction;

    Ok(())
}

#[derive(Accounts)]
pub struct AddReactionContext<'info> {
    #[account(mut)]
    pub reaction_author: Signer<'info>,
    #[account(
        init,
        payer = reaction_author,
        space = 8 + Reaction::INIT_SPACE,
        seeds = [
            TWEET_REACTION_SEED.as_bytes(),
            reaction_author.key().as_ref(),
            tweet.key().as_ref(),
        ],
        bump
    )]
    pub tweet_reaction: Account<'info, Reaction>,
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
    pub system_program: Program<'info, System>,
}
