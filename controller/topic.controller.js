import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadoncloudinary } from "../utils/cloudinary.js";
import { Topic } from "../model/topic.models.js";

const publishTopic = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    
    // Validate required fields
    if (!title || title.trim() === "") {
        throw new ApiError(400, "Title is required");
    }
    
    if (!description || description.trim() === "") {
        throw new ApiError(400, "Description is required");
    }

    // Parse description from JSON string
    let parsedDescription;
    try {
        parsedDescription = typeof description === 'string' 
            ? JSON.parse(description) 
            : description;
    } catch (error) {
        throw new ApiError(400, "Invalid description format. Must be valid JSON array");
    }

    // Validate description structure
    if (!Array.isArray(parsedDescription) || parsedDescription.length === 0) {
        throw new ApiError(400, "Description must be a non-empty array of content blocks");
    }

    // Handle main topic image
    const mainImageFile = req.files?.TopicImage?.[0]?.path;
    if (!mainImageFile) {
        throw new ApiError(400, 'Main topic image is required');
    }

    console.log("Uploading main image:", mainImageFile);
    const mainImageUrl = await uploadoncloudinary(mainImageFile);
    if (!mainImageUrl || !mainImageUrl.url) {
        throw new ApiError(500, 'Error uploading main image to cloudinary');
    }

    // Handle description media files
    const descriptionMediaFiles = req.files?.descriptionMedia || [];
    console.log("Description media files:", descriptionMediaFiles.length);

    // Process description blocks and upload media files
    const processedDescription = await Promise.all(
        parsedDescription.map(async (block, blockIndex) => {
            // Validate block structure
            if (!block.type || !['text', 'image', 'video'].includes(block.type)) {
                throw new ApiError(400, `Invalid block type at index ${blockIndex}`);
            }

            if (block.type === 'text') {
                // For text blocks, content should be provided
                if (!block.content || block.content.trim() === '') {
                    throw new ApiError(400, `Text content required at block ${blockIndex}`);
                }
                return {
                    type: block.type,
                    content: block.content.trim(),
                    order: block.order || blockIndex
                };
            }

            if (block.type === 'image' || block.type === 'video') {
                // Find corresponding uploaded file using fileIndex
                const fileIndex = block.fileIndex;
                
                if (fileIndex === undefined || fileIndex === null) {
                    throw new ApiError(400, `File index missing for ${block.type} block at index ${blockIndex}`);
                }

                const mediaFile = descriptionMediaFiles[fileIndex];
                if (!mediaFile) {
                    throw new ApiError(400, `${block.type} file not found for block ${blockIndex}`);
                }

                console.log(`Uploading ${block.type}:`, mediaFile.path);
                const uploadedMedia = await uploadoncloudinary(mediaFile.path);
                
                if (!uploadedMedia || !uploadedMedia.url) {
                    throw new ApiError(500, `Error uploading ${block.type} to cloudinary for block ${blockIndex}`);
                }

                return {
                    type: block.type,
                    content: uploadedMedia.url, // Store the cloudinary URL
                    order: block.order || blockIndex
                };
            }

            return block;
        })
    );

    // Sort blocks by order
    processedDescription.sort((a, b) => a.order - b.order);

    // Create topic
    const topic = await Topic.create({
        title: title.trim(),
        image: mainImageUrl.url,
        description: processedDescription
    });

    console.log("Topic created successfully:", topic._id);

    return res.status(201).json(
        new ApiResponse(201, topic, "Topic published successfully")
    );
});

const getAllTopics = asyncHandler(async (req, res) => {
    const topics = await Topic.find().sort({ createdAt: -1 });
    
    // Don't throw 404 for empty array - return empty array with 200
    return res.status(200).json(
        new ApiResponse(200, topics, topics.length > 0 ? "Topics retrieved successfully" : "No topics found")
    );
});

const getNewestTopic = asyncHandler(async (req, res) => {
    const topic = await Topic.findOne().sort({ createdAt: -1 });
    
    if (!topic) {
        throw new ApiError(404, "No topics found");
    }
    
    return res.status(200).json(
        new ApiResponse(200, topic, "Newest topic retrieved successfully")
    );
});

const getTopicById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        throw new ApiError(400, "Topic ID is required");
    }

    const topic = await Topic.findById(id);
    
    if (!topic) {
        throw new ApiError(404, "Topic not found");
    }
    
    return res.status(200).json(
        new ApiResponse(200, topic, "Topic retrieved successfully")
    );
});

const updateTopic = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    
    if (!id) {
        throw new ApiError(400, "Topic ID is required");
    }

    const topic = await Topic.findById(id);
    if (!topic) {
        throw new ApiError(404, "Topic not found");
    }

    // Update fields if provided
    if (title && title.trim() !== '') {
        topic.title = title.trim();
    }

    if (description) {
        let parsedDescription;
        try {
            parsedDescription = typeof description === 'string' 
                ? JSON.parse(description) 
                : description;
        } catch (error) {
            throw new ApiError(400, "Invalid description format");
        }
        topic.description = parsedDescription;
    }

    // Handle new main image if uploaded
    if (req.files?.TopicImage?.[0]?.path) {
        const newImageUrl = await uploadoncloudinary(req.files.TopicImage[0].path);
        if (newImageUrl && newImageUrl.url) {
            topic.image = newImageUrl.url;
        }
    }

    const updatedTopic = await topic.save();
    
    return res.status(200).json(
        new ApiResponse(200, updatedTopic, "Topic updated successfully")
    );
});

const deleteTopic = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        throw new ApiError(400, "Topic ID is required");
    }

    const topic = await Topic.findByIdAndDelete(id);
    
    if (!topic) {
        throw new ApiError(404, "Topic not found");
    }
    
    return res.status(200).json(
        new ApiResponse(200, {}, "Topic deleted successfully")
    );
});

export { 
    publishTopic, 
    getAllTopics,
    getNewestTopic,
    getTopicById,
    updateTopic,
    deleteTopic
};