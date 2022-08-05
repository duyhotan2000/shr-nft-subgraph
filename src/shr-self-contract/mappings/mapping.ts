import { BigDecimal, BigInt, Bytes, log, store, ipfs, JSONValue, Value, json } from "@graphprotocol/graph-ts";
import {
  OwnershipTransferred as OwnershipTransferredEvent
} from "../generated/SHRNFTSelfContract/Ownable";
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

export function handleOwnershipTransferred(event: OwnershipTransferredEvent) {
  
}