// import * as anchor from '@coral-xyz/anchor';
import { Program, web3 } from '@coral-xyz/anchor';
import { SYSTEM_PROGRAM_ID } from '@coral-xyz/anchor/dist/cjs/native/system';
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey } from "@solana/web3.js";
import { BankrunProvider } from 'anchor-bankrun';
import { BN } from 'bn.js';
import { BanksClient, Clock, ProgramTestContext, startAnchor } from "solana-bankrun";
import { createMint, mintTo } from 'spl-token-bankrun';
import TokenvestingIDL from '../target/idl/tokenvesting.json';
import { Tokenvesting } from "../target/types/tokenvesting";


describe("Vesting Smart Contract Tests", () => {
    const companyName = "CompanyName";
    let beneficiary: Keypair;
    let context : ProgramTestContext;
    let provider : BankrunProvider;
    let program : Program<Tokenvesting>;
    let banksClient : BanksClient;
    let employer : Keypair;
    let beneficiaryProvider : BankrunProvider;
    let program2 : Program<Tokenvesting>;
    let vestingAccountKey : PublicKey;
    let treasuryTokenAccount : PublicKey;
    let employeeAccount : PublicKey;
    let mint : PublicKey;


    beforeAll(async () => {
        beneficiary = new web3.Keypair();

        context = await startAnchor(
            "",
            [
                {
                    name:"tokenvesting",
                    programId:new PublicKey(TokenvestingIDL.address)
                }
            ],
            [
                {
                    address:beneficiary.publicKey,
                    info : {
                        lamports : 1_000_000_000,
                        data : Buffer.alloc(0),
                        owner : SYSTEM_PROGRAM_ID,
                        executable : false
                    }

                }
            ]
        );

        const provider = new BankrunProvider(context);

        program = new Program<Tokenvesting>(TokenvestingIDL as Tokenvesting,provider)

        banksClient = context.banksClient;

        employer = provider.wallet.payer;

        // @ts-expect-error - Type error in spl-token-bankrun dependency
        mint = await createMint(banksClient,employer,employer.publicKey,null,2,);

        beneficiaryProvider = new BankrunProvider(context);

        beneficiaryProvider.wallet = new NodeWallet(beneficiary);
        
        program2 = new Program<Tokenvesting>(TokenvestingIDL as Tokenvesting,beneficiaryProvider);

        [vestingAccountKey] = PublicKey.findProgramAddressSync(
            [Buffer.from(companyName)],
            program.programId
        );

        [treasuryTokenAccount] = PublicKey.findProgramAddressSync(
            [Buffer.from("vesting_treasure"),Buffer.from(companyName)],
            program.programId
        );

        [employeeAccount] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("employee_vesting"),
                beneficiary.publicKey.toBuffer(),
                vestingAccountKey.toBuffer()
            ],
            program.programId
        )
    });

    it("should create a vesting account",async () => {
        const tx = await program.methods.createVestingAccount(companyName)
        .accounts(
            {
            signer : employer.publicKey,
            mint,
            tokenProgram: TOKEN_PROGRAM_ID
        }).rpc({commitment : "confirmed"})

        const vestingAccountData = await program.account.vestingAccount.fetch(
            vestingAccountKey,
            "confirmed"
        );

        console.log("Vesting Account Data", vestingAccountData,null,2);
        console.log("Create Vesting Account", tx);
    });

    it("should fund the treasury token account", async () => {
        const amount = 10_000 * 10 ** 9;
        const mintTx = await mintTo(
            // @ts-expect-error - Type error in spl-token-bankrun dependency
            banksClient,
            employer,
            mint,
            treasuryTokenAccount,
            employer,
            amount
        );

        console.log("Mint Treasury Token Account",mintTx);
    });

    it("should create employee vesting account", async ()=> {
        const tx2 = await program.methods.createEmployeeAccount(
            new BN(0),
            new BN(100),
            new BN(100),
            new BN(0)
        ).accounts({
            vestingAccount : vestingAccountKey,
            beneficiary : beneficiary.publicKey
        })
        .rpc({commitment : "confirmed",skipPreflight : true});

        console.log("Create Employee Account Tx:",tx2);
        console.log("Employee Account",employeeAccount.toBase58());
    });

    it("should claim the employee's vested tokens",async ()=> {
        await new Promise((resolve) => setTimeout(resolve,1000));
        const currentClock = await banksClient.getClock();
        context.setClock(
            new Clock(
                currentClock.slot,
                currentClock.epochStartTimestamp,
                currentClock.epoch,
                currentClock.leaderScheduleEpoch,
                1000n
            )
        );

        const tx3 = await program2.methods.claimTokens(companyName).accounts({
            tokenProgram:TOKEN_PROGRAM_ID
        }).rpc({commitment:"confirmed"});

        console.log('Claim Tokens Tx:', tx3);
    }); 
})