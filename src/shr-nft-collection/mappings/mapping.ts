import { BigDecimal, BigInt, Bytes, log, store, ipfs, JSONValue, Value, json } from "@graphprotocol/graph-ts";
import {
  SHRNFTTest,
  // AdminChanged,
  // BeaconUpgraded,
  // Upgraded,
  Transfer,
} from "../../../generated/SHRNFTTest/SHRNFTTest";
import {
  All,
  Collection,
  Owner,
  OwnerCollection,
  OwnerPerTokenContract,
  Token,
  TokenContract,
} from "../../../generated/schema";

let ZERO_ADDRESS_STRING = "0x0000000000000000000000000000000000000000";

let ZERO_ADDRESS: Bytes = Bytes.fromHexString(ZERO_ADDRESS_STRING) as Bytes;
let ZERO = BigInt.fromI32(0);
let ONE = BigInt.fromI32(1);
let OWNER_ADDRESS = "0xf2Cf01e96aceD873A1DE9BEad8375292b44ee5D2".toLowerCase();

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

export function handleTransfer(event: Transfer): void {
  // Entities can be loaded from the store using a string ID; this ID
  // needs to be unique across all entities of the same type
  // let entity = Token.load(event.transaction.from.toHex())

  let tokenId = event.params.tokenId;
  let id = event.address.toHex() + "_" + tokenId.toString();
  let contractId = event.address.toHex();
  let from = event.params.from.toHex();
  let to = event.params.to.toHex();

  let all = All.load("all");
  if (all == null) {
    all = new All("all");
    all.numOwners = ZERO;
    all.numTokens = ZERO;
    all.numFreeMintedTokens = ZERO;
    all.totalFeeFreeMintedTokens = ZERO;
    // all.numTokenContracts = ZERO;
  }

  const contract = SHRNFTTest.bind(event.address);
  let tokenContract = TokenContract.load(contractId);
  if (tokenContract == null) {
    // log.error('contract : {}',[event.address.toHexString()]);
    // let supportsEIP165Identifier = supportsInterface(contract, '01ffc9a7');
    // let supportsEIP721Identifier = supportsInterface(contract, '80ac58cd');
    // let supportsNullIdentifierFalse = supportsInterface(contract, '00000000', false);
    // let supportsEIP721 = supportsEIP165Identifier && supportsEIP721Identifier && supportsNullIdentifierFalse;

    // let supportsEIP721Metadata = false;
    // if(supportsEIP721) {
    //     supportsEIP721Metadata = supportsInterface(contract, '5b5e139f');
    //     // log.error('NEW CONTRACT eip721Metadata for {} : {}', [event.address.toHex(), supportsEIP721Metadata ? 'true' : 'false']);
    // }
    tokenContract = new TokenContract(contractId);
    tokenContract.numTokens = ZERO;
    tokenContract.numOwners = ZERO;
    let name = contract.try_name();
    if (!name.reverted) {
      tokenContract.name = normalize(name.value);
    }
    let symbol = contract.try_symbol();
    if (!symbol.reverted) {
      tokenContract.symbol = normalize(symbol.value);
    }
    // all.numTokenContracts = all.numTokenContracts.plus(ONE);
  }

  if (from != ZERO_ADDRESS_STRING || to != ZERO_ADDRESS_STRING) {
    // skip if from zero to zero
    if (from != ZERO_ADDRESS_STRING) {
      // existing token
      let currentOwnerPerTokenContractId = contractId + "_" + from;
      let currentOwnerPerTokenContract = OwnerPerTokenContract.load(
        currentOwnerPerTokenContractId
      );
      if (currentOwnerPerTokenContract != null) {
        if (currentOwnerPerTokenContract.numTokens.equals(ONE)) {
          tokenContract.numOwners = tokenContract.numOwners.minus(ONE);
        }
        currentOwnerPerTokenContract.numTokens = currentOwnerPerTokenContract.numTokens.minus(
          ONE
        );
        currentOwnerPerTokenContract.save();
      }

      let currentOwner = Owner.load(from);
      if (currentOwner != null) {
        if (currentOwner.numTokens.equals(ONE)) {
          all.numOwners = all.numOwners.minus(ONE);
        }
        currentOwner.numTokens = currentOwner.numTokens.minus(ONE);
        currentOwner.save();
      }
    } // else minting

    if (to != ZERO_ADDRESS_STRING) {
      // transfer
      let newOwner = Owner.load(to);
      if (newOwner == null) {
        newOwner = new Owner(to);
        newOwner.numTokens = ZERO;
      }

      let eip721Token = Token.load(id);
      if (eip721Token == null) {
        eip721Token = new Token(id);
        eip721Token.contract = tokenContract.id;
        eip721Token.tokenID = tokenId;
        eip721Token.creator = newOwner.id;
        eip721Token.mintTime = event.block.timestamp;
        eip721Token.isFreeMinted =
          event.transaction.from.toHex().toLowerCase() == OWNER_ADDRESS;
        eip721Token.gasPrice = event.transaction.gasPrice;
        eip721Token.transactionHash = event.transaction.hash.toHex();
        let receipt = event.receipt;
        if(receipt == null) {
          eip721Token.gasUsed = ZERO;
          eip721Token.transactionFee = ZERO;
        } else {
          eip721Token.gasUsed = receipt.gasUsed;
          eip721Token.transactionFee = receipt.gasUsed.times(event.transaction.gasPrice);
        }
        // if (tokenContract.supportsEIP721Metadata) {
        let metadataURI = contract.try_tokenURI(tokenId);
        if (!metadataURI.reverted) {
          eip721Token.tokenURI = normalize(metadataURI.value);
          const hash = eip721Token.tokenURI.replace("ipfs://", "");
          const data = ipfs.cat(hash);
          eip721Token.tokenURIJson = data;
        } else {
          eip721Token.tokenURI = "";
          eip721Token.tokenURIJson = null;
        }
        // } else {
        //     // log.error('tokenURI not supported {}', [tokenContract.id]);
        //     eip721Token.tokenURI = ""; // TODO null ?
        // }
      }

      const collectionId = contract.tokenToCollection(tokenId);
      eip721Token.owner = newOwner.id;
      eip721Token.collection = collectionId;
      eip721Token.save();

      if (newOwner.numTokens.equals(ZERO)) {
        all.numOwners = all.numOwners.plus(ONE);
      }
      newOwner.numTokens = newOwner.numTokens.plus(ONE);
      newOwner.save();

      let newOwnerPerTokenContractId = contractId + "_" + to;
      let newOwnerPerTokenContract = OwnerPerTokenContract.load(
        newOwnerPerTokenContractId
      );
      if (newOwnerPerTokenContract == null) {
        newOwnerPerTokenContract = new OwnerPerTokenContract(
          newOwnerPerTokenContractId
        );
        newOwnerPerTokenContract.owner = newOwner.id;
        newOwnerPerTokenContract.contract = tokenContract.id;
        newOwnerPerTokenContract.numTokens = ZERO;
      }

      if (newOwnerPerTokenContract.numTokens.equals(ZERO)) {
        tokenContract.numOwners = tokenContract.numOwners.plus(ONE);
      }
      newOwnerPerTokenContract.numTokens = newOwnerPerTokenContract.numTokens.plus(
        ONE
      );
      newOwnerPerTokenContract.save();

      // Update owners of Collection
      // const collectionId = contract.tokenToCollection(tokenId);
      let collection = Collection.load(collectionId);
      if (collection == null) {
        collection = new Collection(collectionId);
        collection.save();
      }
      const ownerCollectionId = to.concat(collectionId);
      let ownerCollection = OwnerCollection.load(ownerCollectionId);
      if (ownerCollection == null) {
        ownerCollection = new OwnerCollection(ownerCollectionId);
        ownerCollection.owner = to;
        ownerCollection.collection = collectionId;
        ownerCollection.save();
      }

      if (from == ZERO_ADDRESS_STRING) {
        // mint +1
        all.numTokens = all.numTokens.plus(ONE);
        tokenContract.numTokens = tokenContract.numTokens.plus(ONE);
        let tokens = collection.tokens;
        if(tokens == null) {
          tokens = [];
        }
        tokens.push(eip721Token.id);
        collection.tokens = tokens;
        if (event.transaction.from.toHex().toLowerCase() == OWNER_ADDRESS) {
          all.numFreeMintedTokens = all.numFreeMintedTokens.plus(ONE);
          all.totalFeeFreeMintedTokens = all.totalFeeFreeMintedTokens.plus(
            eip721Token.transactionFee
          );
        }
        collection.save();
        all.save();
      } else {
        let isTokenFoundInCollection = false;
        let tokens = collection.tokens;
        if(tokens == null) {
          tokens = [];
        }
        for (let i = 0; i < tokens.length; i++) {
          const token = Token.load(tokens[i]);
          if (token == null) {
            continue;
          }
          if (token.owner == from) {
            isTokenFoundInCollection = true;
            break;
          }
        }
        if (isTokenFoundInCollection == false) {
          ownerCollection = OwnerCollection.load(from.concat(collectionId));
          if (ownerCollection != null) {
            store.remove("OwnerCollection", ownerCollection.id);
          }
        }
      }
    } else {
      // burn
      store.remove("Token", id);
      all.numTokens = all.numTokens.minus(ONE);
      tokenContract.numTokens = tokenContract.numTokens.minus(ONE);
    }
  }

  tokenContract.save();
  all.save();

  // Entities only exist after they have been saved to the store;
  // `null` checks allow to create entities on demand
  // if (!entity) {
  //   entity = new Token(event.transaction.from.toHex())

  //   // Entity fields can be set using simple assignments
  //   entity.count = BigInt.fromI32(0)
  // }

  // BigInt and BigDecimal math are supported
  // entity.count = entity.count + BigInt.fromI32(1)

  // Entity fields can be set based on event parameters
  // entity.previousAdmin = event.params.previousAdmin
  // entity.newAdmin = event.params.newAdmin

  // Entities can be written to the store with `.save()`
  // entity.save()

  // Note: If a handler doesn't require existing field values, it is faster
  // _not_ to load the entity from the store. Instead, create it fresh with
  // `new Entity(...)`, set the fields that should be updated and save the
  // entity back to the store. Fields that were not set or unset remain
  // unchanged, allowing for partial updates to be applied.

  // It is also possible to access smart contracts from mappings. For
  // example, the contract that has emitted the event can be connected to
  // with:
  //
  // let contract = Contract.bind(event.address)
  //
  // The following functions can then be called on this contract to access
  // state variables and other data:
  //
  // None
}
