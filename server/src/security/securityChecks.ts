import { Request } from 'express'
import dcl from 'decentraland-crypto-middleware'

import { denyListedIPS, TESTS_ENABLED, Metadata } from '../utils'
import { checkCoords, checkPlayer } from './verifyOnMap'

export function checkOrigin(req: Request) {
  const validOrigins = ['https://play.decentraland.org', 'https://play.decentraland.zone']
  return validOrigins.includes(req.header('origin'))
}

export function checkBannedIPs(req: Request) {
  const ip = req.header('X-Forwarded-For')
  return denyListedIPS.includes(ip)
}

export async function runChecks(
  req: Request & dcl.DecentralandSignatureData<Metadata>,
  parcel?: number[]
) {
  const metadata = req.authMetadata
  const userAddress = req.auth
  const coordinates = metadata.parcel.split(',').map((item: string) => {
    return parseInt(item, 10)
  })

  // check that the request comes from a decentraland domain
  const validOrigin = (TESTS_ENABLED && metadata.realm.catalystName === 'localhost')
    ? true
    : checkOrigin(req)
  if (!validOrigin) {
    throw new Error('INVALID ORIGIN')
  }

  // filter against a denylist of malicious ips
  const validIP = checkBannedIPs(req)
  if (validIP) {
    throw new Error('INVALID IP')
  }

  // Validate that the authchain signature is real
  // validate that the player is in the catalyst & location from the signature
  const validCatalystPos: boolean = (TESTS_ENABLED && metadata.realm.catalystName === 'localhost')
    ? true
    : await checkPlayer(
      userAddress,
      metadata.realm.domain,
      coordinates
    )
  if (!validCatalystPos) {
    throw new Error('INVALID PLAYER POSITION')
  }

  // validate that the player is in a valid location for this operation - if a parcel is provided
  const validPos: boolean = parcel?.length ? checkCoords(coordinates, parcel) : true

  if (!validPos) {
    throw new Error('INVALID PARCEL POSITION')
  }
}
