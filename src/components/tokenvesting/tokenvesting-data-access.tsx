'use client'

import { getTokenvestingProgram, getTokenvestingProgramId } from '@project/anchor'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import toast from 'react-hot-toast'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../ui/ui-layout'

interface CreateVestingArgs{
  companyName :string;
  mint:string;
}

export function useTokenvestingProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getTokenvestingProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getTokenvestingProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['tokenvesting', 'all', { cluster }],
    queryFn: () => program.account.vestingAccount.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createVestingAccount = useMutation<String,Error,CreateVestingArgs>({
    mutationKey: ['vestingAccount', 'create', { cluster }],
    mutationFn: ({companyName,mint}) =>
      program.methods.createVestingAccount(companyName)
    .accounts({ mint: new PublicKey(mint),tokenProgram:TOKEN_PROGRAM_ID })
    // .signers([keypair])
    .rpc(),
    onSuccess: (signature) => {
      transactionToast(signature)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to create vesting account'),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
    initialize,
  }
}

export function useTokenvestingProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useTokenvestingProgram()

  const accountQuery = useQuery({
    queryKey: ['tokenvesting', 'fetch', { cluster, account }],
    queryFn: () => program.account.tokenvesting.fetch(account),
  })

  const closeMutation = useMutation({
    mutationKey: ['tokenvesting', 'close', { cluster, account }],
    mutationFn: () => program.methods.close().accounts({ tokenvesting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
  })

  const decrementMutation = useMutation({
    mutationKey: ['tokenvesting', 'decrement', { cluster, account }],
    mutationFn: () => program.methods.decrement().accounts({ tokenvesting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const incrementMutation = useMutation({
    mutationKey: ['tokenvesting', 'increment', { cluster, account }],
    mutationFn: () => program.methods.increment().accounts({ tokenvesting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  const setMutation = useMutation({
    mutationKey: ['tokenvesting', 'set', { cluster, account }],
    mutationFn: (value: number) => program.methods.set(value).accounts({ tokenvesting: account }).rpc(),
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
  })

  return {
    accountQuery,
    closeMutation,
    decrementMutation,
    incrementMutation,
    setMutation,
  }
}
