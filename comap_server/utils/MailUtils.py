import logging
import os

from mailjet_rest import Client

from datetime import datetime, timedelta, timezone


def isNoneOrEmpty(sString):
    return sString is None or sString == ''


def sendEmailMailJet(sSender, sRecipient, sTitle, sMessage, bAddAdminToRecipient):

    if isNoneOrEmpty(sSender) or isNoneOrEmpty(sRecipient):
        logging.warning("RiseUtils.sendEmailMailJet. Sender or recipient of the mail not specified. Mail not sent")
        return False

    if bAddAdminToRecipient is None:
        bAddAdminToRecipient = False

    aoRecipients = list()
    aoRecipients.append(_getJetmailUserObject(sRecipient))

    oSender = _getJetmailUserObject(sSender)

    oMessage = {
        'Messages': [
            {
                "From": oSender,
                "To": aoRecipients,
                "Subject": sTitle,
                "HTMLPart": sMessage
            }
        ]
    }

    try:
        sApiKey = os.getenv("MAILJET_API_KEY")
        sApiSecret = os.getenv("MAILJET_API_SECRET")
        oMailjetService = Client(auth=(sApiKey, sApiSecret), version='v3.1')
        oMailjetService.send.create(data=oMessage)

        return True

    except Exception as oEx:
        logging.error(f"RiseUtils.sendEmailMailJet. Exception {oEx}")

    return False


def _getJetmailUserObject(sEmail):
    if isNoneOrEmpty(sEmail):
        return None

    return {
        "Email": sEmail,
        "Name": sEmail
    }
