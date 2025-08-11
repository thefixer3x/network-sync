"use strict";
return postId;
try { }
catch (error) {
    this.handleLinkedInError(error);
    throw error;
}
async;
getMetrics();
Promise < AccountMetrics > {
    try: {
        // Get basic profile information
        const: profileResponse = await axios.get(`${this.baseURL}/me`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0'
            }
        }),
        // Get connection count (this requires additional permissions)
        let, connectionsCount = 0,
        try: {
            const: connectionsResponse = await axios.get(`${this.baseURL}/connections?q=viewer&count=0`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            }),
            connectionsCount = connectionsResponse.data.paging?.total || 0
        }, catch(error) {
            this.logger.warn('Could not fetch connections count:', error.response?.data);
        },
        return: {
            id: crypto.randomUUID(),
            platform: 'linkedin',
            followersCount: connectionsCount, // LinkedIn uses connections instead of followers
            followingCount: 0, // Not available in LinkedIn API
            postsCount: await this.getPostsCount(),
            engagementRate: await this.calculateEngagementRate(),
            growthRate: 0, // Requires historical data
            averageLikes: await this.calculateAverageLikes(),
            averageComments: await this.calculateAverageComments(),
            averageShares: await this.calculateAverageShares(),
            topPerformingContent: await this.getTopPerformingPosts(),
            recordedAt: new Date(),
        }
    }, catch(error) {
        this.handleLinkedInError(error);
        throw error;
    }
};
async;
deletePost(postId, string);
Promise < boolean > {
    try: {
        await, axios, : .delete(`${this.baseURL}/ugcPosts/${encodeURIComponent(postId)}`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0'
            }
        }),
        this: .logger.info(`LinkedIn post ${postId} deleted successfully`),
        return: true
    }, catch(error) {
        this.handleLinkedInError(error);
        throw error;
    }
};
async;
schedulePost(content, Content);
Promise < string > {
    // LinkedIn API doesn't support native scheduling
    throw: new Error('LinkedIn API does not support native post scheduling')
};
validateContent(content, Content);
void {
    if(content) { }, : .content.length > 3000
};
{
    throw new SocialMediaError('LinkedIn post exceeds 3000 character limit', 'linkedin', 'CONTENT_TOO_LONG');
}
async;
uploadMedia(mediaUrls, string[]);
Promise < any[] > {
    const: mediaAssets = [],
    for(, url, of, mediaUrls) {
        try {
            // Register upload
            const registerResponse = await axios.post(`${this.baseURL}/assets?action=registerUpload`, {
                registerUploadRequest: {
                    owner: `urn:li:person:${this.personId}`,
                    recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                    serviceRelationships: [{
                            relationshipType: 'OWNER',
                            identifier: 'urn:li:userGeneratedContent'
                        }]
                }
            }, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0'
                }
            });
            const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
            const asset = registerResponse.data.value.asset;
            // Upload the actual media
            const mediaResponse = await fetch(url);
            const mediaBuffer = await mediaResponse.arrayBuffer();
            await axios.post(uploadUrl, Buffer.from(mediaBuffer), {
                headers: {
                    'Content-Type': mediaResponse.headers.get('content-type') || 'image/jpeg'
                }
            });
            mediaAssets.push({
                status: 'READY',
                description: {
                    text: 'Image uploaded via automation'
                },
                media: asset,
                title: {
                    text: 'Automated Post Image'
                }
            });
        }
        catch (error) {
            this.logger.error(`Failed to upload media ${url}:`, error);
        }
    },
    return: mediaAssets
};
extractPostId(linkedinId, string);
string;
{
    // Extract the actual post ID from LinkedIn's response
    return linkedinId.split(':').pop() || linkedinId;
}
async;
getPostsCount();
Promise < number > {
    try: {
        const: response = await axios.get(`${this.baseURL}/ugcPosts?q=authors&authors=urn:li:person:${this.personId}&count=0`, {
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'X-Restli-Protocol-Version': '2.0.0'
            }
        }),
        return: response.data.paging?.total || 0
    }, catch(error) {
        return 0;
    }
};
async;
calculateEngagementRate();
Promise < number > {
    // This requires Social Actions API which has limited access
    // Return 0 for now, implement when API access is available
    return: 0
};
async;
calculateAverageLikes();
Promise < number > {
    // Requires Social Actions API
    return: 0
};
async;
calculateAverageComments();
Promise < number > {
    // Requires Social Actions API
    return: 0
};
async;
calculateAverageShares();
Promise < number > {
    // Requires Social Actions API
    return: 0
};
async;
getTopPerformingPosts();
Promise < string[] > {
    // Requires Social Actions API for engagement metrics
    return: []
};
handleLinkedInError(error, any);
void {
    if(error) { }, : .response?.status === 429
};
{
    const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    throw new RateLimitError('linkedin', resetTime);
}
if (error.response?.status === 401) {
}
//# sourceMappingURL=FacebookService.js.map