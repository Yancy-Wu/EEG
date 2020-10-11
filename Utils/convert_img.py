import cv2
import numpy as np
from PIL import Image
import argparse
import os

def gbk_path(file_path = ""):
    file_path_gbk = file_path.encode('gbk')        # unicode转gbk，字符串变为字节数组
    return file_path_gbk.decode('gbk')

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('-r', type=str, help='new resolution')
    parser.add_argument('-f', type=str, help='from file dir')
    parser.add_argument('-t', type=str, help='target file dir')

    args = parser.parse_args()
    resolution_str = args.r.split('x')
    x = int(resolution_str[0])
    y = int(resolution_str[1])

    target_dir = os.path.abspath(args.t)
    os.chdir(args.f)
    
    for fpath, dirs, fs in os.walk('.'):
        for d in dirs:
            try:
                new_dir_path = os.path.join(target_dir, fpath, d)
                os.makedirs(new_dir_path)
            except FileExistsError:
                continue
        for f in fs:
            if f.endswith('.png'):
                fn = os.path.join(fpath, f)
                new_fn = os.path.join(target_dir, fpath, f)
                im = cv2.imdecode(np.fromfile(fn, dtype=np.uint8), -1)
                # image = Image.fromarray(cv2.cvtColor(im, cv2.COLOR_BGR2RGB))
                im = cv2.resize(im, (x, y))
                # im.resize((x, y))
                # print(im)
                cv2.imencode('.png', im)[1].tofile(new_fn)
                # image.save(gbk_path(new_fn), quality=95, dpi=(x, y))
                print("[DONE]: " + fn)
