import { assert, expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { MetaNft } from "../typechain";
import { TransferEvent } from "../typechain/MetaNft";

describe("MetaNft", function () {

  /////////////////
  // VARIABLES
  /////////////////
  let metaNftContract: MetaNft;
  let signers: Array<Signer>;

  /////////////////
  // BEFORE HOOK
  /////////////////
  before(async () => {
    const metaNftContractFactory = await ethers.getContractFactory("MetaNft");
    metaNftContract = await metaNftContractFactory.deploy();
    await metaNftContract.deployed();

    signers = await ethers.getSigners();
  });

  /////////////////
  // TEST
  /////////////////
  it("Meta transfer should work correctly", async function () {
    const [owner, recipient, relayer] = [signers[1], signers[5], signers[7]];
    const [ownerAddr, recipientAddr, relayerAddr] = await Promise.all([
      owner.getAddress(),
      recipient.getAddress(),
      relayer.getAddress()
    ])

    // Mint NFT to owner
    const txnMint = await metaNftContract.connect(owner).mintFree();
    const rcptMint = await txnMint.wait();
    const { args: { tokenId } } = rcptMint.events?.find(({ event }) => event === "Transfer") as TransferEvent;

    // Send NFT to recipient
    const nonce = Date.now();
    const signature = await owner.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.solidityPack(
            ["uint256", "address", "address", "uint256"],
            [nonce, ownerAddr, recipientAddr, tokenId]
          )
        )
      ));
    const txnTransfer = await metaNftContract.connect(relayer).transferMeta(nonce, ownerAddr, recipientAddr, tokenId, signature);
    await txnTransfer.wait();

    // Test that transaction happened
    const newOwner = await metaNftContract.ownerOf(tokenId);
    assert.equal(newOwner, recipientAddr, "Recipient did not receive the NFT!");
  });
});
