import httpx
import asyncio

async def test_pollination():
    query = "airline flight overbooking economics"
    prompt = f"Stylized editorial illustration about {query}, highly detailed, beautiful lighting, professional, clean background."
    
    # URL encode the prompt
    encoded_prompt = prompt.replace(' ', '%20')
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}"
    
    print("Testing Pollinations.ai...")
    print(f"Requesting URL: {url}\n")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, timeout=30.0)
            print("Status Code:", response.status_code)
            print("Response Content-Type:", response.headers.get("content-type"))
            
            if response.status_code == 200:
                output_path = "scratch/test_generated_image.jpg"
                with open(output_path, "wb") as f:
                    f.write(response.content)
                print(f"\nSUCCESS: Generated image saved to {output_path}")
            else:
                print(f"Failed with status: {response.status_code}")
                
        except Exception as e:
            print(f"Error calling Pollinations.ai: {e}")

if __name__ == "__main__":
    asyncio.run(test_pollination())
