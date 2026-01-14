from enum import Enum


class CollaboratorRole(str, Enum):
    """Enum for collaborator roles in a project"""
    CO_OWNER = "co-owner"
    ANNOTATOR = "annotator"
    REVIEWER = "reviewer"