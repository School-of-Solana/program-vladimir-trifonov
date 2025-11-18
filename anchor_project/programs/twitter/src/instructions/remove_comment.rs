use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::states::*;

pub fn remove_comment(ctx: Context<RemoveCommentContext>) -> Result<()> {
    let comment = &ctx.accounts.comment;
    let comment_author = &ctx.accounts.comment_author;

    let author_key = comment_author.key();
    let content_hash = hash(comment.content.as_bytes());
    let seeds = [
        COMMENT_SEED.as_bytes(),
        author_key.as_ref(),
        content_hash.as_ref(),
        comment.parent_tweet.as_ref(),
    ];
    let (expected_pda, _) = Pubkey::find_program_address(&seeds, ctx.program_id);

    if comment.key() != expected_pda {
        return Err(anchor_lang::error::Error::from(
            anchor_lang::error::ErrorCode::ConstraintSeeds,
        ));
    }

    Ok(())
}

#[derive(Accounts)]
pub struct RemoveCommentContext<'info> {
    #[account(mut)]
    pub comment_author: Signer<'info>,
    #[account(
        mut,
        close = comment_author,
        has_one = comment_author,
    )]
    pub comment: Account<'info, Comment>,
}
