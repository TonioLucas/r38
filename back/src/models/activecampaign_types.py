"""ActiveCampaign API type definitions using TypedDict."""

from typing import TypedDict, Optional


class ActiveCampaignContact(TypedDict, total=False):
    """Contact data for ActiveCampaign API."""
    email: str
    firstName: str
    lastName: str
    phone: str


class SyncContactRequest(TypedDict):
    """Request body for POST /contact/sync endpoint."""
    contact: ActiveCampaignContact


class ContactResponse(TypedDict):
    """Contact object returned by ActiveCampaign API."""
    id: str
    email: str
    firstName: str
    lastName: str
    phone: str
    cdate: str
    udate: str


class SyncContactResponse(TypedDict):
    """Response from POST /contact/sync endpoint."""
    contact: ContactResponse


class ContactTagData(TypedDict):
    """Contact tag data for adding tags."""
    contact: str
    tag: str


class AddTagRequest(TypedDict):
    """Request body for POST /contactTags endpoint."""
    contactTag: ContactTagData


class ContactTagResponse(TypedDict):
    """Response from POST /contactTags endpoint."""
    contactTag: dict


class Tag(TypedDict):
    """Tag object from ActiveCampaign API."""
    id: str
    tag: str
    tagType: str
    description: str


class ListTagsResponse(TypedDict):
    """Response from GET /tags endpoint."""
    tags: list
    meta: dict
