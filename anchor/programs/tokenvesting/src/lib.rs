#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

declare_id!("coUnmi3oBUtwtd9fjeAvSsJssXh5A5xyPbhpewyzRVF");

#[program]
pub mod tokenvesting {
    use super::*;

    pub fn create_vesting_account(
        ctx: Context<CreateVestingAccount>,
        company_name: String,
    ) -> Result<()> {
        *ctx.accounts.vesting_account = VestingAccount {
            owner: ctx.accounts.signer.key(),
            mint: ctx.accounts.mint.key(),
            treasure_token_account: ctx.accounts.treasure_token_account.key(),
            company_name,
            treasure_bump: ctx.bumps.treasure_token_account,
            bump: ctx.bumps.vesting_account,
        };
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(company_name:String)]
pub struct CreateVestingAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
    init,
    payer = signer,
    space = 8 + VestingAccount::INIT_SPACE,
    seeds = [company_name.as_bytes()],
    bump
  )]
    pub vesting_account: Account<'info, VestingAccount>,

    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
    init,
    token::mint = mint,
    token::authority = signer,
    payer = signer,
    seeds = [b"vesting_treasure",company_name.as_bytes()],
    bump
  )]
    pub treasure_token_account: InterfaceAccount<'info, TokenAccount>,

    pub system_program: Program<'info, System>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
#[derive(InitSpace)]
pub struct VestingAccount {
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub treasure_token_account: Pubkey,
    #[max_len(50)]
    pub company_name: String,
    pub treasure_bump: u8,
    pub bump: u8,
}
