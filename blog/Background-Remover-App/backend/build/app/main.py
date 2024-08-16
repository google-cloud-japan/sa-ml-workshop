import base64
import json
import os
import tempfile
import traceback
import numpy as np
import torch
import torchvision
from io import BytesIO
from PIL import Image
from fastapi import FastAPI, Request

from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

app = FastAPI()
is_cuda = torch.cuda.is_available()
print(f'PyTorch version: {torch.__version__}')
print(f'Torchvision version: {torchvision.__version__}')
print(f'CUDA is available: {is_cuda}')

# https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_large.pt
checkpoint = 'sam2_hiera_large.pt'
model_cfg = 'sam2_hiera_l.yaml'

if is_cuda:
    torch.autocast(device_type='cuda', dtype=torch.bfloat16).__enter__()
    if torch.cuda.get_device_properties(0).major >= 8:
        # turn on tfloat32 for Ampere GPUs 
        # (https://pytorch.org/docs/stable/notes/cuda.html#tensorfloat-32-tf32-on-ampere-devices)
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True
    device = torch.device('cuda')
else:
    device = torch.device('cpu')

print(f'Model config: {model_cfg}')
print(f'Using device: {device}')
sam2_model = build_sam2(model_cfg, checkpoint, device=device)
predictor = SAM2ImagePredictor(sam2_model)


@app.get(os.getenv('AIP_HEALTH_ROUTE', '/health'), status_code=200)
def health():
    return {}


@app.post(os.getenv('AIP_PREDICT_ROUTE', '/predict'))
async def predict(request: Request):
    debug = os.getenv('DEBUG', False)
    body = await request.json()
    instances = body['instances']

    predictions = []
    for item in instances:
        if 'id' in item.keys():
            instance_id = item['id']
        else:
            instance_id = None
        if 'image' not in item.keys():
            predictions.append({
                'id': instance_id,
                'image': None,
                'error': 'Field "image" is required.'
            })
            continue

        try:
            image = Image.open(BytesIO(base64.b64decode(item['image'])))
            image = np.array(image.convert('RGB'))
            predictor.set_image(image)

            input_params = {
                'box': None,
                'points': None,
                'labels': None,
            }
            for param in input_params.keys():
                if param in item.keys():
                    if item[param] is not None:
                        input_params[param] = np.array(item[param])

            if debug:
                for param in input_params.keys():
                    print(f'{param}: {input_params[param]}')

            masks, _, _ = predictor.predict(
                box=input_params['box'],
                point_coords=input_params['points'],
                point_labels=input_params['labels'],
                multimask_output=False
            )
            
            mask = masks[0].astype(np.uint8)
            h, w = mask.shape
            image = image.astype(np.uint8)
            masked_image = Image.fromarray(image * mask.reshape((h, w ,1)))
            masked_image.putalpha(alpha=Image.fromarray(mask*255))
            buf = BytesIO()
            masked_image.save(buf, format='PNG')
            masked_image_b64 = base64.b64encode(buf.getvalue())            
            predictions.append({
                'id': instance_id,
                'image': masked_image_b64
            })
        except Exception as e:
            if debug:
                print(traceback.format_exc())
            predictions.append({
                'id': instance_id,
                'image': None,
                'error': str(e)
            })

    response = {
        'predictions': predictions
    }

    if debug:
        for item in response['predictions']:
            for key in sorted(item.keys()):
                if key == 'id':
                    print(f'\nid: {item[key]}')
                else:
                    print(f'- {key}: {np.array(item[key]).shape}')

    return response
