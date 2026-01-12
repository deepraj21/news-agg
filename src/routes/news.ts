import express, { Request, Response } from 'express';
import { z } from 'zod';
import { processUrls } from '../services/urlProcessor';
import { ProcessNewsRequest, ProcessNewsResponse } from '../types';

const router = express.Router();

const processNewsSchema = z.object({
  urls: z.array(z.string().url()).min(1, 'At least one URL is required'),
  clusterId: z.string().optional(),
});

router.post('/process', async (req: Request, res: Response) => {
  try {
    const validationResult = processNewsSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const response: ProcessNewsResponse = {
        success: false,
        error: validationResult.error.errors.map(e => e.message).join(', '),
      };
      return res.status(400).json(response);
    }

    const { urls, clusterId } = validationResult.data;

    const cluster = await processUrls(urls, clusterId);

    const response: ProcessNewsResponse = {
      success: true,
      data: cluster,
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing news:', error);
    const response: ProcessNewsResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
    res.status(500).json(response);
  }
});

export default router;

