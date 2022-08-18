import { BigDecimal, BigInt, Bytes, log, store, ipfs, JSONValue, Value, json } from "@graphprotocol/graph-ts";
import {
  OwnershipTransferred as OwnershipTransferredEvent,
  URI as URIEvent,
  TransferSingle as TransferSingleEvent,
  TransferBatch as TransferBatchEvent,
  ERC1155Contract
} from "../generated/templates/Collection/ERC1155Contract";
import {
  All,
  CollectibleContract,
  Owner
} from "../generated/schema";

import {
	events,
	transactions,
} from '@amxx/graphprotocol-utils'

let ZERO_ADDRESS_STRING = "0x0000000000000000000000000000000000000000";

let ZERO_ADDRESS: Bytes = Bytes.fromHexString(ZERO_ADDRESS_STRING) as Bytes;
let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);

function toBytes(hexString: String): Bytes {
  let result = new Uint8Array(hexString.length / 2);
  for (let i = 0; i < hexString.length; i += 2) {
    result[i / 2] = parseInt(hexString.substr(i, 2), 16) as u32;
  }
  return result as Bytes;
}

// function supportsInterface(contract: EIP721, interfaceId: String, expected : boolean = true) : boolean {
//   let supports = contract.try_supportsInterface(toBytes(interfaceId));
//   return !supports.reverted && supports.value == expected;
// }

function setCharAt(str: string, index: i32, char: string): string {
  if (index > str.length - 1) return str;
  return str.substr(0, index) + char + str.substr(index + 1);
}

function normalize(strValue: string): string {
  if (strValue.length === 1 && strValue.charCodeAt(0) === 0) {
    return "";
  } else {
    for (let i = 0; i < strValue.length; i++) {
      if (strValue.charCodeAt(i) === 0) {
        strValue = setCharAt(strValue, i, "\ufffd"); // graph-node db does not support string with '\u0000'
      }
    }
    return strValue;
  }
}

export function handleOwnershipTransferred(event: OwnershipTransferredEvent): void {
  log.info("OwnershipTransferredEvent ADDRESS: {}", [event.address.toHexString()]);
  log.info("OwnershipTransferredEvent FROM: {}", [event.params.newOwner.toHexString()]);
  log.info("OwnershipTransferredEvent TO: {}", [event.params.previousOwner.toHexString()]);
}

export function handleURI(event: URIEvent): void {
  

}

export function handleTransferSingle(event: TransferSingleEvent): void {
  let tokenId = event.params.id;
  let id = event.address.toHex() + "_" + tokenId.toString();
  let contractId = event.address.toHex();
  let from = event.params.from.toHex();
  let to = event.params.to.toHex();
  let value = event.params.value.toHex();

  const contract = ERC1155Contract.bind(event.address);
  let collectibleContract = CollectibleContract.load(contractId);
  if (from != ZERO_ADDRESS_STRING || to != ZERO_ADDRESS_STRING) {
    if (from != ZERO_ADDRESS_STRING) {
      // existing token
      
    }  // else minting

    if (to != ZERO_ADDRESS_STRING) {

    } else {
      // burn
    }
  }
}

export function handleTransferBatch(event: TransferBatchEvent): void {
  
}




