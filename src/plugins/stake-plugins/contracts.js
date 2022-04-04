// @flow

import { ethers } from 'ethers'

import MASONRY_ABI from './abi/MASONRY_ABI.json'
import TOMB_TREASURY_ABI from './abi/TOMB_TREASURY_ABI.json'
import TSHARE_ABI from './abi/TSHARE_ABI.json'

export const rpcProviderUrls = [
  'https://rpc.ftm.tools',
  'https://rpc.fantom.network',
  'https://rpc2.fantom.network',
  'https://rpc3.fantom.network',
  'https://rpcapi.fantom.network',
  'https://rpc.ankr.com/fantom'
]
export const providers = rpcProviderUrls.map<ethers.Provider>(url => new ethers.providers.JsonRpcProvider(url))

type ContractInfoEntry = {
  name: string,
  abi: mixed,
  address: string
}
const contractInfoEntries: ContractInfoEntry[] = [
  {
    name: 'TOMB_MASONRY',
    abi: MASONRY_ABI,
    address: '0x8764de60236c5843d9faeb1b638fbce962773b67'
  },
  {
    name: 'TOMB_TREASURY',
    abi: TOMB_TREASURY_ABI,
    address: '0xF50c6dAAAEC271B56FCddFBC38F0b56cA45E6f0d'
  },
  {
    name: 'TSHARE',
    abi: TSHARE_ABI,
    address: '0x4cdF39285D7Ca8eB3f090fDA0C069ba5F4145B37'
  }
]

// Index Contract Info objects
const contractInfoIndex: { [index: string]: ContractInfoEntry } = {}
const indexFields: string[] = ['name', 'address']
contractInfoEntries.forEach((info: ContractInfoEntry) => {
  indexFields.forEach((field: string) => {
    const key = `${field}:${info.name}`
    if (contractInfoIndex[key] != null) throw new Error(`Duplicate contract info for '${key}'`)
    contractInfoIndex[key] = info
  })
})

export const getContractInfo = (index: string): ContractInfoEntry | void => {
  return indexFields.filter(field => contractInfoIndex[`${field}:${index}`] != null).map(field => contractInfoIndex[`${field}:${index}`])[0]
}

export const makeContract = (addressOrName: string) => {
  const contractInfo = getContractInfo(addressOrName)
  if (contractInfo == null) throw new Error(`Unable to get contract info for '${addressOrName}'`)
  const { abi, address } = contractInfo
  return new ethers.Contract(address, abi, providers[0])
}

let lastServerIndex = 0
export const multipass = async (fn: (provider: ethers.Provider) => Promise<any>) => {
  const provider = providers[lastServerIndex % providers.length]
  try {
    return await fn(provider)
  } catch (error) {
    // Move index forward if an error is thrown
    ++lastServerIndex
    throw error
  }
}

export const makeSigner = (seed: string, provider: ethers.Provider = providers[0]) => new ethers.Wallet(seed, provider)
