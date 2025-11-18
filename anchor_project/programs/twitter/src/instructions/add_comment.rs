use anchor_lang::prelude::*;

use crate::errors::TwitterError;
use crate::states::*;

pub fn add_comment(ctx: Context<AddCommentContext>, comment_content: String) -> Result<()> {
    require!(
        comment_content.as_bytes().len() <= COMMENT_LENGTH,
        TwitterError::CommentTooLong
    );

    let comment_author = &ctx.accounts.comment_author;
    let tweet = &ctx.accounts.tweet;
    let comment = &ctx.accounts.comment;

    let author_key = comment_author.key();
    let tweet_key = tweet.key();
    let content_hash = anchor_lang::solana_program::hash::hash(comment_content.as_bytes());

    let seeds = [
        COMMENT_SEED.as_bytes(),
        author_key.as_ref(),
        content_hash.as_ref(),
        tweet_key.as_ref(),
    ];

    let (expected_pda, bump) = Pubkey::find_program_address(&seeds, ctx.program_id);
    require_keys_eq!(
        comment.key(),
        expected_pda,
        anchor_lang::error::ErrorCode::ConstraintSeeds
    );

    let rent = Rent::get()?;
    let space = 8 + Comment::INIT_SPACE;
    let lamports = rent.minimum_balance(space);

    anchor_lang::system_program::create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: comment_author.to_account_info(),
                to: comment.to_account_info(),
            },
            &[&[
                COMMENT_SEED.as_bytes(),
                author_key.as_ref(),
                content_hash.as_ref(),
                tweet_key.as_ref(),
                &[bump],
            ]],
        ),
        lamports,
        space as u64,
        ctx.program_id,
    )?;

    let comment_state = Comment {
        comment_author: author_key,
        parent_tweet: tweet_key,
        content: comment_content,
        bump,
    };

    comment_state.try_serialize(&mut &mut comment.try_borrow_mut_data()?[..])?;

    Ok(())
}

#[derive(Accounts)]
pub struct AddCommentContext<'info> {
    #[account(mut)]
    pub comment_author: Signer<'info>,
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
    /// CHECK: PDA is derived and initialised within the instruction.
    #[account(mut)]
    pub comment: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}
